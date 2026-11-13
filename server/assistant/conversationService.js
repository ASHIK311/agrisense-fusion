/**
 * AgriSense Fusion - Assistant Conversation Service
 * Manages persistent multi-tenant chat threads, scoped message histories, and user feedback.
 */

const storage = require('../storage/storageService');

class ConversationService {
  listConversations(userContext = null) {
    if (!userContext || !userContext.id) {
      return [];
    }
    const list = storage.getAssistantConversations(userContext.id);
    return list.map((c) => ({
      id: c.id,
      title: c.title,
      created_at: c.created_at,
      updated_at: c.updated_at,
      message_count: (c.messages || []).length
    })).reverse();
  }

  getConversationWithAccessCheck(id, userContext = null) {
    if (!userContext || !userContext.id) {
      return { error: 'UNAUTHORIZED', statusCode: 401, conversation: null };
    }
    const raw = storage.getAssistantConversationRaw(id);
    if (!raw) {
      return { error: 'NOT_FOUND', statusCode: 404, conversation: null };
    }
    if (raw.user_id !== userContext.id) {
      return { error: 'FORBIDDEN', statusCode: 403, conversation: null };
    }
    return { error: null, statusCode: 200, conversation: raw };
  }

  getConversation(id, userContext = null) {
    if (!userContext || !userContext.id) return null;
    return storage.getAssistantConversationById(id, userContext.id);
  }

  createConversation(title = 'New Agricultural Consultation', userContext = null) {
    if (!userContext || !userContext.id) {
      const err = new Error('Authentication required to create persistent conversations.');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }
    const newConv = {
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: userContext.id,
      title: title || 'New Agricultural Consultation',
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    storage.saveAssistantConversation(newConv);
    return newConv;
  }

  appendMessage(conversationId, role, content, metadata = {}, userContext = null) {
    if (!userContext || !userContext.id) {
      const err = new Error('Authentication required to persist conversation messages.');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    let conv = null;
    if (conversationId) {
      const raw = storage.getAssistantConversationRaw(conversationId);
      if (raw && raw.user_id !== userContext.id) {
        const err = new Error('Access denied: You do not own this conversation.');
        err.statusCode = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
      conv = raw;
    }

    if (!conv) {
      conv = this.createConversation(content.slice(0, 40) + '...', userContext);
    }

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role, // 'user' | 'assistant'
      content,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };

    conv.messages.push(message);
    conv.updated_at = new Date().toISOString();

    // Auto-update title if it's the first user message
    if (conv.messages.length === 1 && role === 'user') {
      conv.title = content.slice(0, 50).trim();
    }

    storage.saveAssistantConversation(conv);
    return { conversation: conv, message };
  }

  deleteConversationWithAccessCheck(id, userContext = null) {
    if (!userContext || !userContext.id) {
      return { error: 'UNAUTHORIZED', statusCode: 401, deleted: false };
    }
    const raw = storage.getAssistantConversationRaw(id);
    if (!raw) {
      return { error: 'NOT_FOUND', statusCode: 404, deleted: false };
    }
    if (raw.user_id !== userContext.id) {
      return { error: 'FORBIDDEN', statusCode: 403, deleted: false };
    }
    const deleted = storage.deleteAssistantConversation(id, userContext.id);
    return { error: null, statusCode: 200, deleted };
  }

  deleteConversation(id, userContext = null) {
    if (!userContext || !userContext.id) return false;
    return storage.deleteAssistantConversation(id, userContext.id);
  }

  saveFeedback({ conversationId, messageId, rating, comments, userContext = null }) {
    if (!userContext || !userContext.id) {
      const err = new Error('Authentication required to submit conversation feedback.');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }
    if (conversationId) {
      const raw = storage.getAssistantConversationRaw(conversationId);
      if (raw && raw.user_id !== userContext.id) {
        const err = new Error('Access denied: Cannot submit feedback on another user\'s conversation.');
        err.statusCode = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }
    const record = {
      conversation_id: conversationId,
      message_id: messageId,
      rating: Number(rating) || 5, // 1 to 5
      comments: comments || null,
      user_id: userContext.id
    };
    return storage.saveAssistantFeedback(record);
  }
}

module.exports = new ConversationService();
