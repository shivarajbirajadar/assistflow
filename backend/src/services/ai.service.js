
import { generateText, llmAvailable } from '../config/llm.js';
import { classifyConversation } from './classification.service.js';

// Convert conversation messages into readable text
const getConversationText = (conversation) => {
  const messages = conversation.messages || [];

  return messages.map((message) => {
    const sender =
      message.from?.name ||
      message.from?.email ||
      'Unknown';

    const recipient =
      message.to?.name ||
      message.to?.email ||
      'Unknown';

    return [
      'From: ' + sender,
      'To: ' + recipient,
      'Subject: ' + (conversation.subject || 'No subject'),
      'Date: ' + (message.sentAt || ''),
      'Message:',
      message.body || '',
    ].join('\n');
  }).join('\n--------------------\n');
};

// Safely parse JSON returned by Gemini
const parseAIResponse = (response) => {
  if (typeof response !== 'string' || !response.trim()) {
    throw new Error('Gemini returned an empty response.');
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
    throw new Error('Gemini returned an invalid response object.');
  }

  return parsed;
};

// Generate email conversation summary
export const summarizeConversation = async (conversation) => {
  if (!llmAvailable()) {
    return {
      summary: 'AI summary is unavailable because the AI service is not configured.',
      keyPoints: [],
      actionItems: [],
      actionRequired: false,
      importantDates: [],
      fallback: true,
    };
  }

  try {
    const prompt = `
You are an expert email conversation summarization assistant.

Analyze the following email conversation.

SUBJECT:
${conversation.subject || 'No subject'}

EMAIL CONVERSATION:
${getConversationText(conversation)}

Return ONLY a valid JSON object in this exact structure:

{
  "summary": "A concise summary of the conversation",
  "keyPoints": ["Important point 1"],
  "actionItems": ["Action item 1"],
  "actionRequired": true,
  "importantDates": ["Deadline or date mentioned"]
}

STRICT RULES:
- Summarize only the provided conversation.
- Never invent information.
- Mention names, dates and deadlines only when present.
- Identify the actual request made by the sender.
- Include important deadlines in keyPoints or importantDates.
- If no action is required, actionRequired must be false.
- Keep the summary concise and clear.
- Return valid JSON only.
`;

    const response = await generateText(prompt, {
      json: true,
      temperature: 0.1,
      retries: 2,
      timeoutMs: 45000,
      throttleMs: 1000,
    });

    const result = parseAIResponse(response);

    if (
      typeof result.summary !== 'string' ||
      !result.summary.trim()
    ) {
      throw new Error('Gemini returned an empty summary.');
    }

    return {
      summary: result.summary.trim(),

      keyPoints: Array.isArray(result.keyPoints)
        ? result.keyPoints.filter(
            (point) => typeof point === 'string'
          )
        : [],

      actionItems: Array.isArray(result.actionItems)
        ? result.actionItems.filter(
            (item) => typeof item === 'string'
          )
        : [],

      actionRequired: Boolean(result.actionRequired),

      importantDates: Array.isArray(result.importantDates)
        ? result.importantDates.filter(
            (date) => typeof date === 'string'
          )
        : [],

      fallback: false,
    };

  } catch (error) {
    console.error(
      'Conversation summary failed:',
      error
    );

    return {
      summary: 'Unable to generate an AI summary. Please review the email conversation.',
      keyPoints: [],
      actionItems: [],
      actionRequired: false,
      importantDates: [],
      fallback: true,
    };
  }
};

// Controller-compatible summary function
export const generateSummary = async (conversation) => {
  const result = await summarizeConversation(conversation);

  return {
    text: result.summary,
    keyPoints: result.keyPoints,
    dates: (result.importantDates || []).map((date) => ({
      label: date,
      date,
    })),
    fallback: result.fallback,
  };
};

// Explain why AI classified an email with a particular label
export const answerWhyLabel = async (conversation) => {
  if (!llmAvailable()) {
    return {
      explanation: conversation.reason || 'AI explanation is unavailable.',
      fallback: true,
    };
  }

  try {
    const prompt = `
Explain why this email conversation belongs to the following category.

Subject: ${conversation.subject || ''}

Assigned category: ${conversation.label || 'Unknown'}

Existing classification reason:
${conversation.reason || 'Not available'}

Email conversation:
${getConversationText(conversation)}

Return a short explanation in plain text.
Mention the important signals that support this classification.
Do not invent details.
`;

    const response = await generateText(prompt, {
      temperature: 0.2,
      retries: 1,
      timeoutMs: 20000,
      throttleMs: 1000,
    });

    return {
      explanation: response.trim(),
      fallback: false,
    };
  } catch (error) {
    console.error('Label explanation failed:', error.message);

    return {
      explanation: conversation.reason ||
        'Unable to generate an explanation right now.',
      fallback: true,
    };
  }
};

// Answer questions about a particular email conversation
// UNCHANGED: Existing working Ask About This Email implementation.
export const answerConversation = async (conversation, question) => {
  if (!question || !question.trim()) {
    throw new Error('Please provide a question.');
  }

  if (!llmAvailable()) {
    return {
      answer: 'AI is currently unavailable. Please configure the AI service.',
      fallback: true,
      references: [],
    };
  }

  try {
    const prompt = `
You are an AI assistant helping manage email conversations.

Answer the user's question using ONLY the email conversation provided below.

EMAIL SUBJECT:
${conversation.subject || 'No subject'}

EMAIL CONVERSATION:
${getConversationText(conversation)}

USER QUESTION:
${question}

Rules:
- Only use information from this conversation.
- Never invent names, dates, promises or facts.
- If information is missing, clearly say that it is not mentioned.
- Keep the answer direct and useful.
- Do not use information from other conversations.
`;

    const response = await generateText(prompt, {
      temperature: 0.2,
      retries: 2,
      timeoutMs: 30000,
      throttleMs: 1000,
    });

    return {
      answer: response.trim(),
      fallback: false,
      references: [
        {
          conversationId: conversation._id,
          subject: conversation.subject,
        },
      ],
    };
  } catch (error) {
    console.error('Conversation question failed:', error.message);

    return {
      answer: 'Unable to answer this question right now. Please try again.',
      fallback: true,
      references: [],
    };
  }
};

// Controller-compatible question function
export const answerConversationQuestion = async (conversation, question) => {
  const result = await answerConversation(conversation, question);

  return {
    text: result.answer,
    references: result.references,
    fallback: result.fallback,
  };
};

// Reclassify an existing conversation
export const reclassifyConversation = async (conversation) => {
  return classifyConversation(conversation);
};

// Generate a reply draft for an email conversation
export const generateReply = async (
  conversation,
  instructions = '',
  tone = 'professional'
) => {
  if (!llmAvailable()) {
    throw new Error('AI service is unavailable. Please configure GEMINI_API_KEY.');
  }

  const prompt = `
You are an experienced professional email assistant.

Write a reply to the following email conversation.

SUBJECT:
${conversation.subject || 'No subject'}

EMAIL CONVERSATION:
${getConversationText(conversation)}

ADDITIONAL INSTRUCTIONS:
${instructions || 'Write an appropriate response to the latest message.'}

TONE:
${tone}

Rules:
- Reply only to the latest incoming message.
- Keep the response natural and professional.
- Do not invent facts, commitments, dates or information.
- Do not claim that an action has been completed unless the conversation confirms it.
- Do not include a subject line.
- Return only the email reply body.
`;

  try {
    const response = await generateText(prompt, {
      temperature: 0.4,
      retries: 2,
      timeoutMs: 30000,
      throttleMs: 1000,
    });

    return {
      body: response.trim(),
      status: 'draft',
    };
  } catch (error) {
    console.error('Reply generation failed:', error.message);
    throw new Error('Unable to generate reply. Please try again.');
  }
};

// Controller-compatible reply function
export const generateReplyDraft = async (conversation, instructions = '') => {
  return generateReply(conversation, instructions);
};
