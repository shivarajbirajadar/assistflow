import { apiClient } from './context.jsx';

/* =========================================================
   COMMON REQUEST HANDLER
========================================================= */

async function request(promise) {
  const response = await promise;
  return response.data;
}

const encode = (value) => encodeURIComponent(value);


/* =========================================================
   AUTHENTICATION
========================================================= */

export const authAPI = {
  register: (data) =>
    request(apiClient.post('/auth/register', data)),

  login: (data) =>
    request(apiClient.post('/auth/login', data)),

  getMe: () =>
    request(apiClient.get('/auth/me')),
};


/* =========================================================
   EMAIL ACCOUNTS
========================================================= */

export const accountsAPI = {
  getAll: (params = {}) =>
    request(apiClient.get('/accounts', { params })),

  create: (data) =>
    request(apiClient.post('/accounts', data)),

  update: (accountId, data) =>
    request(apiClient.patch(`/accounts/${encode(accountId)}`, data)),

  reconnect: (accountId) =>
    request(apiClient.post(`/accounts/${encode(accountId)}/reconnect`)),

  disconnect: (accountId) =>
    request(apiClient.post(`/accounts/${encode(accountId)}/disconnect`)),

  delete: (accountId) =>
    request(apiClient.delete(`/accounts/${encode(accountId)}`)),
};


/* =========================================================
   CONVERSATIONS
========================================================= */

export const conversationsAPI = {
  getAll: (params = {}) =>
    request(apiClient.get('/conversations', { params })),

  getTriage: (params = {}) =>
    request(apiClient.get('/conversations/triage', { params })),

  getById: (conversationId) =>
    request(
      apiClient.get(`/conversations/${encode(conversationId)}`)
    ),

  updateLabel: (conversationId, data) =>
    request(
      apiClient.patch(
        `/conversations/${encode(conversationId)}/label`,
        data
      )
    ),

  revertLabel: (conversationId, data = {}) =>
    request(
      apiClient.post(
        `/conversations/${encode(conversationId)}/label/revert`,
        data
      )
    ),

  toggleStar: (conversationId, data = {}) =>
    request(
      apiClient.patch(
        `/conversations/${encode(conversationId)}/star`,
        data
      )
    ),

  markRead: (conversationId, data = {}) =>
    request(
      apiClient.patch(
        `/conversations/${encode(conversationId)}/read`,
        data
      )
    ),

  archive: (conversationId, data = {}) =>
    request(
      apiClient.patch(
        `/conversations/${encode(conversationId)}/archive`,
        data
      )
    ),

  snooze: (conversationId, data) =>
    request(
      apiClient.patch(
        `/conversations/${encode(conversationId)}/snooze`,
        data
      )
    ),

  assign: (conversationId, data) =>
    request(
      apiClient.patch(
        `/conversations/${encode(conversationId)}/assign`,
        data
      )
    ),

  complete: (conversationId, data = {}) =>
    request(
      apiClient.patch(
        `/conversations/${encode(conversationId)}/complete`,
        data
      )
    ),

  bulkAction: (data) =>
    request(
      apiClient.post('/conversations/bulk', data)
    ),
};


/* =========================================================
   AI FEATURES
========================================================= */

export const aiAPI = {
  getSummary: (conversationId) =>
    request(
      apiClient.get(
        `/conversations/${encode(conversationId)}/summary`
      )
    ),

  getWhyLabel: (conversationId) =>
    request(
      apiClient.get(
        `/conversations/${encode(conversationId)}/why-label`
      )
    ),

  askAboutConversation: (conversationId, data) =>
    request(
      apiClient.post(
        `/conversations/${encode(conversationId)}/ask`,
        data
      )
    ),

  reclassify: (conversationId, data) =>
    request(
      apiClient.post(
        `/conversations/${encode(conversationId)}/reclassify`,
        data
      )
    ),

  createDraft: (conversationId, data = {}) =>
    request(
      apiClient.post(
        `/conversations/${encode(conversationId)}/drafts`,
        data
      )
    ),

  updateDraft: (conversationId, draftId, data) =>
    request(
      apiClient.patch(
        `/conversations/${encode(conversationId)}/drafts/${encode(draftId)}`,
        data
      )
    ),

  approveDraft: (conversationId, draftId, data = {}) =>
    request(
      apiClient.post(
        `/conversations/${encode(conversationId)}/drafts/${encode(draftId)}/approve`,
        data
      )
    ),

  sendDraft: (conversationId, draftId, data = {}) =>
    request(
      apiClient.post(
        `/conversations/${encode(conversationId)}/drafts/${encode(draftId)}/send`,
        data
      )
    ),
};


/* =========================================================
   DASHBOARD
========================================================= */

export const dashboardAPI = {
  getOverview: (params = {}) =>
    request(
      apiClient.get('/dashboard/overview', { params })
    ),

  getStats: (params = {}) =>
    request(
      apiClient.get('/dashboard/stats', { params })
    ),

  getActivity: (params = {}) =>
    request(
      apiClient.get('/dashboard/activity', { params })
    ),
};


/* =========================================================
   CLIENT VIEW
========================================================= */

export const clientAPI = {
  getInbox: (params = {}) =>
    request(
      apiClient.get('/client/inbox', { params })
    ),

  markHandled: (conversationId, data = {}) =>
    request(
      apiClient.post(
        `/client/conversations/${encode(conversationId)}/handled`,
        data
      )
    ),

  takeOver: (conversationId, data = {}) =>
    request(
      apiClient.post(
        `/client/conversations/${encode(conversationId)}/takeover`,
        data
      )
    ),
};


/* =========================================================
   NOTIFICATIONS
========================================================= */

export const notificationsAPI = {
  getAll: (params = {}) =>
    request(
      apiClient.get('/notifications', { params })
    ),

  markRead: (notificationId) =>
    request(
      apiClient.patch(
        `/notifications/${encode(notificationId)}/read`
      )
    ),

  markAllRead: () =>
    request(
      apiClient.patch('/notifications/read-all')
    ),
};


/* =========================================================
   CORRECTION RULES
========================================================= */

export const rulesAPI = {
  getAll: (params = {}) =>
    request(
      apiClient.get('/rules', { params })
    ),

  create: (data) =>
    request(
      apiClient.post('/rules', data)
    ),
};


/* =========================================================
   DEMO / SIMULATION
========================================================= */

export const simulationAPI = {
  simulateIncoming: (data = {}) =>
    request(
      apiClient.post('/simulate/incoming', data)
    ),
};


/* =========================================================
   API ERROR HELPERS
========================================================= */

export function getAPIError(error) {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  if (error?.code === 'ERR_NETWORK') {
    return 'Unable to connect to the server. Please check your connection.';
  }

  return error?.message || 'Something went wrong. Please try again.';
}


export function isUnauthorized(error) {
  return error?.response?.status === 401;
}


export function isForbidden(error) {
  return error?.response?.status === 403;
}