
import CorrectionRule from '../models/CorrectionRule.js';
import {
  LABELS,
  LABEL_SOURCES,
  CONFIDENCE_THRESHOLD,
} from '../config/index.js';
import { generateText, llmAvailable } from '../config/llm.js';

const VALID_LABELS = Object.values(LABELS);

const ALLOWED_TAGS = [
  'meeting',
  'action_required',
  'important',
  'general',
  'waiting_for_response',
];

const SYSTEM_PROMPT = `
You are an email classification assistant.

Your task is to decide WHO should respond to an email.

Use exactly one of these labels:

assistant_reply:
The assistant can independently handle the task, including scheduling,
coordination, routine follow-ups and administrative work.

client_reply:
The account owner must personally respond, including personal opinions,
quotes, decisions, approvals and sensitive business matters.

no_reply:
No response is needed, including newsletters, notifications,
receipts and automated alerts.

needs_review:
The email is genuinely ambiguous or requires human judgment.

Rules:
- Use only the four exact labels above.
- Never invent another label.
- Personal quotes requested from the owner must be client_reply.
- Confidence must be between 0 and 1.
- Never invent information.
- Tags may only contain:
  meeting, action_required, important, general, waiting_for_response.

Return only valid JSON in this format:

{
  "label": "client_reply",
  "confidence": 0.90,
  "reason": "The owner is personally requested to provide a quote.",
  "summary": "The sender requests a personal quote.",
  "actionRequired": true,
  "keyPoints": ["A quote is requested"],
  "tags": ["action_required"],
  "suggestedAction": "Owner should provide the requested quote."
}
`;

const getConversationText = (conversation) => {
  const messages = conversation.messages || [];

  const messageText = messages.map((message) => {
    const from = message.from || {};
    const to = message.to || {};

    return [
      'From: ' + (from.name || ''),
      'Email: ' + (from.email || ''),
      'To: ' + (to.name || ''),
      'Recipient Email: ' + (to.email || ''),
      'Body: ' + (message.body || ''),
    ].join('\n');
  }).join('\n\n');

  const firstIncoming = messages.find(
    (message) => message.direction === 'in'
  );

  return [
    'Subject: ' + (conversation.subject || ''),
    '',
    'Sender: ' + (firstIncoming?.from?.name || conversation.fromName || ''),
    'Sender Email: ' + (
      firstIncoming?.from?.email || conversation.fromEmail || ''
    ),
    '',
    'Conversation:',
    messageText,
  ].join('\n');
};

const parseClassificationResponse = (response) => {
  if (!response || typeof response !== 'string') {
    throw new Error('Gemini returned an empty classification response.');
  }

  const cleaned = response
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Gemini did not return a valid JSON object.');
  }

  const parsed = JSON.parse(cleaned.substring(start, end + 1));

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Gemini returned an invalid classification object.');
  }

  return parsed;
};

const findMatchingRule = async (ownerId, senderEmail) => {
  if (!ownerId || !senderEmail) return null;

  const normalizedEmail = senderEmail.toLowerCase().trim();

  const domain = normalizedEmail.includes('@')
    ? normalizedEmail.split('@').pop()
    : '';

  return CorrectionRule.findOne({
    ownerId,
    active: true,
    $or: [
      { senderEmail: normalizedEmail },
      ...(domain ? [{ senderDomain: domain }] : []),
    ],
  }).sort({ senderEmail: -1 });
};

const classifyWithFallback = (conversation) => {
  const text = getConversationText(conversation).toLowerCase();

  const noReplyKeywords = [
    'unsubscribe',
    'newsletter',
    'promotional offer',
    'order confirmation',
    'payment receipt',
    'transaction successful',
    'security alert',
    'do not reply',
    'no-reply',
    'noreply',
  ];

  const clientReplyKeywords = [
    'your approval is required',
    'please approve',
    'need your decision',
    'your decision',
    'personal approval',
    'confidential',
    'urgent decision',
    'please confirm personally',
    'personal opinion',
    'two line quote',
    'two-line quote',
    'share a quote',
    'provide a quote',
    'your quote',
    'owner personally',
  ];

  const assistantReplyKeywords = [
    'please schedule',
    'please arrange',
    'please coordinate',
    'please share the details',
    'please send the documents',
    'can you follow up',
    'please book',
    'meeting availability',
    'please confirm the meeting',
  ];

  if (noReplyKeywords.some((keyword) => text.includes(keyword))) {
    return {
      label: LABELS.NONE,
      confidence: 0.82,
      reason: 'The email appears to be an automated notification that does not require a reply.',
      summary: 'Automated email or notification.',
      actionRequired: false,
      keyPoints: [],
      tags: [],
      suggestedAction: 'No action required.',
      source: LABEL_SOURCES.FALLBACK,
    };
  }

  if (clientReplyKeywords.some((keyword) => text.includes(keyword))) {
    return {
      label: LABELS.CLIENT,
      confidence: 0.85,
      reason: 'The email requests personal input, a quote, or a decision from the account owner.',
      summary: 'The owner needs to personally review and respond.',
      actionRequired: true,
      keyPoints: [],
      tags: ['action_required', 'important'],
      suggestedAction: 'Forward to the owner for a personal response.',
      source: LABEL_SOURCES.FALLBACK,
    };
  }

  if (assistantReplyKeywords.some((keyword) => text.includes(keyword))) {
    return {
      label: LABELS.ASSISTANT,
      confidence: 0.72,
      reason: 'The email contains a task that can likely be handled by the assistant.',
      summary: 'The email contains an administrative request.',
      actionRequired: true,
      keyPoints: [],
      tags: ['action_required'],
      suggestedAction: 'Review the request and prepare a response.',
      source: LABEL_SOURCES.FALLBACK,
    };
  }

  return {
    label: LABELS.REVIEW,
    confidence: 0.40,
    reason: 'The fallback classifier could not confidently determine who should respond.',
    summary: 'This email needs manual review.',
    actionRequired: true,
    keyPoints: [],
    tags: ['important'],
    suggestedAction: 'Review the email manually.',
    source: LABEL_SOURCES.FALLBACK,
  };
};

const normalizeResult = (result) => {
  if (!VALID_LABELS.includes(result.label)) {
    throw new Error(
      `Gemini returned an unsupported label: ${result.label}`
    );
  }

  const confidence = Math.min(
    Math.max(Number(result.confidence) || 0, 0),
    1
  );

  const tags = Array.isArray(result.tags)
    ? result.tags.filter((tag) => ALLOWED_TAGS.includes(tag))
    : [];

  return {
    label: confidence < CONFIDENCE_THRESHOLD
      ? LABELS.REVIEW
      : result.label,
    confidence,
    reason: typeof result.reason === 'string'
      ? result.reason
      : 'Classification completed.',
    summary: typeof result.summary === 'string'
      ? result.summary
      : '',
    actionRequired: Boolean(result.actionRequired),
    keyPoints: Array.isArray(result.keyPoints)
      ? result.keyPoints.filter((point) => typeof point === 'string')
      : [],
    tags,
    suggestedAction: typeof result.suggestedAction === 'string'
      ? result.suggestedAction
      : '',
    source: LABEL_SOURCES.AI,
  };
};

export const classifyConversation = async (
  conversation,
  ownerId = conversation.ownerId
) => {
  const firstIncoming = conversation.messages?.find(
    (message) => message.direction === 'in'
  );

  const senderEmail = (
    firstIncoming?.from?.email ||
    conversation.fromEmail ||
    ''
  ).toLowerCase().trim();

  // 1. Custom correction rules
  const matchingRule = await findMatchingRule(ownerId, senderEmail);

  if (matchingRule) {
    matchingRule.usageCount += 1;
    await matchingRule.save();

    return {
      label: matchingRule.forcedLabel,
      confidence: 1,
      reason: matchingRule.note || 'Matched an existing custom classification rule.',
      summary: '',
      actionRequired: matchingRule.forcedLabel !== LABELS.NONE,
      keyPoints: [],
      tags: [],
      suggestedAction: 'Classification applied using a custom rule.',
      source: LABEL_SOURCES.RULE,
    };
  }

  // 2. Fallback if Gemini is unavailable
  if (!llmAvailable()) {
    return classifyWithFallback(conversation);
  }

  // 3. Gemini classification
  try {
    const prompt = [
      'Classify the following email conversation.',
      '',
      getConversationText(conversation),
      '',
      'Return exactly one of these labels:',
      'assistant_reply, client_reply, no_reply, needs_review.',
      'Return only valid JSON.',
    ].join('\n');

    const response = await generateText(prompt, {
      system: SYSTEM_PROMPT,
      json: true,
      temperature: 0.1,
      retries: 2,
      timeoutMs: 30000,
      throttleMs: 1000,
    });

    const parsedResult = parseClassificationResponse(response);

    return normalizeResult(parsedResult);

  } catch (error) {
    console.error(
      'AI classification failed. Using fallback:',
      error
    );

    const fallbackResult = classifyWithFallback(conversation);

    return {
      ...fallbackResult,
      reason: 'AI classification unavailable. ' + fallbackResult.reason,
    };
  }
};

export { classifyWithFallback };
