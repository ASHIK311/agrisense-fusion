/**
 * AgriSense Fusion - Master AI Assistant Service
 * Orchestrates multi-tenant conversations, hybrid RAG retrieval, deterministic tools, and response synthesis.
 */

const contextBuilder = require('./contextBuilder');
const conversationService = require('./conversationService');
const llmProvider = require('./llmProvider');
const toolRegistry = require('./toolRegistry');
const retrievalService = require('./retrievalService');

class AssistantService {
  /**
   * Process a conversational turn.
   * - Authenticated users: full multi-tenant persistent conversation + owned/demo farm & field access.
   * - Unauthenticated callers: strictly stateless public demo mode (no conversation persisted, no conversation_id allowed, no private farm/field access).
   */
  async chat({ message, conversationId = null, farmId = null, fieldId = null, userContext = null }) {
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      const err = new Error('Message is required.');
      err.statusCode = 400;
      throw err;
    }

    const isAuthenticated = Boolean(userContext && userContext.id);

    // If unauthenticated caller supplies a conversationId, reject with 401
    if (!isAuthenticated && conversationId) {
      const err = new Error('Authentication required to access or continue persistent conversation threads.');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    // If authenticated caller supplies a conversationId owned by another user, reject with 403
    let conv = null;
    if (isAuthenticated && conversationId) {
      const check = conversationService.getConversationWithAccessCheck(conversationId, userContext);
      if (check.error === 'FORBIDDEN') {
        const err = new Error('Access denied: You do not have permission to access another user\'s conversation.');
        err.statusCode = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
      conv = check.conversation;
    }

    // Build history (persistent for authenticated user, single-turn stateless for anonymous public demo)
    let history = [{ role: 'user', content: message.trim() }];
    if (isAuthenticated) {
      if (!conv) {
        conv = conversationService.createConversation(message.slice(0, 45) + '...', userContext);
      }
      const { conversation: updatedConv } = conversationService.appendMessage(conv.id, 'user', message.trim(), {}, userContext);
      conv = updatedConv;
      history = (conv.messages || []).slice(-6).map((m) => ({ role: m.role, content: m.content }));
    }

    // Build context & validate farm/field access (throws 401/403 on unauthorized private farm/field)
    const { systemPrompt, contextPayload } = await contextBuilder.buildContext({
      userMessage: message.trim(),
      farmId,
      fieldId,
      userContext,
      history
    });

    // Generate tool-backed response
    const responsePayload = await llmProvider.generateResponse({
      systemPrompt,
      messages: history,
      farmContext: {
        ...contextPayload,
        farm: contextPayload.active_farm,
        active_field: contextPayload.active_field
      },
      tools: toolRegistry.getToolDefinitions(),
      userContext
    });

    if (isAuthenticated && conv) {
      const { message: savedAssistantMsg } = conversationService.appendMessage(
        conv.id,
        'assistant',
        responsePayload.message,
        {
          provider: responsePayload.provider,
          generation_mode: responsePayload.generation_mode || null,
          language: responsePayload.language,
          tool_calls: responsePayload.tool_calls || [],
          sources: responsePayload.sources || []
        },
        userContext
      );

      return {
        success: true,
        mode: 'authenticated_persistent',
        conversation_id: conv.id,
        message_id: savedAssistantMsg.id,
        response: responsePayload.message,
        provider: responsePayload.provider,
        generation_mode: responsePayload.generation_mode || 'offline_deterministic_retrieval_synthesis',
        retrieval_method: responsePayload.retrieval_method || 'hybrid_lexical_bm25_char_ngram_rrf',
        language: responsePayload.language,
        tool_calls: responsePayload.tool_calls || [],
        sources: responsePayload.sources || [],
        created_at: savedAssistantMsg.metadata.timestamp
      };
    }

    // Stateless Public Demo Mode (no conversation persisted)
    return {
      success: true,
      mode: 'stateless_public_demo',
      conversation_id: null,
      message_id: `stateless-msg-${Date.now()}`,
      response: responsePayload.message,
      provider: responsePayload.provider,
      generation_mode: responsePayload.generation_mode || 'offline_deterministic_retrieval_synthesis',
      retrieval_method: responsePayload.retrieval_method || 'hybrid_lexical_bm25_char_ngram_rrf',
      language: responsePayload.language,
      tool_calls: responsePayload.tool_calls || [],
      sources: responsePayload.sources || [],
      created_at: new Date().toISOString()
    };
  }

  /**
   * Direct RAG Knowledge Base Query
   */
  queryKnowledge(query, category = null, limit = 5) {
    if (!query) return [];
    return retrievalService.retrieve(query, { category, limit });
  }

  /**
   * Direct Tool Execution
   */
  async executeTool(name, params = {}, userContext = null) {
    return await toolRegistry.executeTool(name, params, userContext);
  }

  /**
   * Get Available Tool Schemas
   */
  getAvailableTools() {
    return toolRegistry.getToolDefinitions();
  }

  /**
   * Conversation Management Passthrough
   */
  listConversations(userContext) {
    return conversationService.listConversations(userContext);
  }

  getConversationWithAccessCheck(id, userContext) {
    return conversationService.getConversationWithAccessCheck(id, userContext);
  }

  getConversation(id, userContext) {
    return conversationService.getConversation(id, userContext);
  }

  deleteConversationWithAccessCheck(id, userContext) {
    return conversationService.deleteConversationWithAccessCheck(id, userContext);
  }

  deleteConversation(id, userContext) {
    return conversationService.deleteConversation(id, userContext);
  }

  saveFeedback(data) {
    return conversationService.saveFeedback(data);
  }
}

module.exports = new AssistantService();
