/**
 * AgriSense Fusion - AI Agricultural Assistant Routes
 * /api/v1/assistant/*
 */

const express = require('express');
const router = express.Router();
const assistantService = require('../assistant/assistantService');
const { optionalAuth, authenticateToken } = require('../middleware/auth');
const { assistantLimiter } = require('../middleware/rateLimiter');

const MAX_MESSAGE_CHARS = 4000;
const MAX_QUERY_CHARS = 1000;
const ASSISTANT_TIMEOUT_MS = parseInt(process.env.ASSISTANT_TIMEOUT_MS || '25000', 10);

function withAssistantTimeout(promise) {
  let timerId;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      const err = new Error('Assistant response timed out.');
      err.statusCode = 504;
      err.code = 'ASSISTANT_TIMEOUT';
      reject(err);
    }, ASSISTANT_TIMEOUT_MS);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timerId));
}

const PRIVATE_OR_TENANT_TOOLS = new Set([
  'get_sensor_telemetry',
  'get_groundwater_status'
]);

// POST /api/v1/assistant/chat
// Supports authenticated persistent mode (JWT) and stateless public demo mode (anonymous)
router.post('/chat', optionalAuth, assistantLimiter, async (req, res) => {
  try {
    const { message, conversation_id, farm_id, field_id, user_id } = req.body || {};
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Field "message" is required and cannot be empty.' });
    }
    if (message.trim().length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({
        success: false,
        error: 'MESSAGE_TOO_LONG',
        message: `Field "message" exceeds maximum length of ${MAX_MESSAGE_CHARS} characters.`
      });
    }

    // Never trust client-supplied user_id; reject spoofing attempts
    if (user_id !== undefined && user_id !== null) {
      if (!req.user || String(user_id) !== String(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN_USER_ID_SPOOFING',
          message: 'User identity is derived strictly from validated JWT credentials; client-supplied user_id is forbidden.'
        });
      }
    }

    const outcome = await withAssistantTimeout(assistantService.chat({
      message: message.trim(),
      conversationId: conversation_id || null,
      farmId: farm_id || null,
      fieldId: field_id || null,
      userContext: req.user || null
    }));

    res.json(outcome);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    if (statusCode >= 500) {
      console.error('[AssistantRoute] Error processing chat:', err);
    }
    res.status(statusCode).json({
      success: false,
      error: err.code || err.message,
      message: err.message
    });
  }
});

// POST /api/v1/assistant/stream (Server-Sent Events streaming)
router.post('/stream', optionalAuth, assistantLimiter, async (req, res) => {
  try {
    const { message, conversation_id, farm_id, field_id, user_id } = req.body || {};
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Field "message" is required.' });
    }
    if (message.trim().length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({
        success: false,
        error: 'MESSAGE_TOO_LONG',
        message: `Field "message" exceeds maximum length of ${MAX_MESSAGE_CHARS} characters.`
      });
    }

    if (user_id !== undefined && user_id !== null) {
      if (!req.user || String(user_id) !== String(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN_USER_ID_SPOOFING',
          message: 'User identity is derived strictly from validated JWT credentials.'
        });
      }
    }

    // Pre-generate response before opening SSE stream so 401/403/404 status codes can be returned cleanly
    const outcome = await withAssistantTimeout(assistantService.chat({
      message: message.trim(),
      conversationId: conversation_id || null,
      farmId: farm_id || null,
      fieldId: field_id || null,
      userContext: req.user || null
    }));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send metadata chunk
    res.write(`data: ${JSON.stringify({ type: 'start', mode: outcome.mode, conversation_id: outcome.conversation_id, provider: outcome.provider, language: outcome.language })}\n\n`);

    // Stream text in words/tokens
    const words = outcome.response.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ') + ' ';
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    }

    // Send tool calls & sources chunk
    res.write(`data: ${JSON.stringify({
      type: 'done',
      tool_calls: outcome.tool_calls,
      sources: outcome.sources,
      message_id: outcome.message_id
    })}\n\n`);

    res.end();
  } catch (err) {
    const statusCode = err.statusCode || 500;
    if (!res.headersSent) {
      return res.status(statusCode).json({
        success: false,
        error: err.code || err.message,
        message: err.message
      });
    }
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  }
});

// GET /api/v1/assistant/conversations (Requires JWT Authentication)
router.get('/conversations', authenticateToken, (req, res) => {
  const conversations = assistantService.listConversations(req.user);
  res.json({
    success: true,
    total: conversations.length,
    conversations
  });
});

// GET /api/v1/assistant/conversations/:id (Requires JWT Authentication + Ownership)
router.get('/conversations/:id', authenticateToken, (req, res) => {
  const check = assistantService.getConversationWithAccessCheck(req.params.id, req.user);
  if (check.error) {
    return res.status(check.statusCode).json({
      success: false,
      error: check.error,
      message: check.statusCode === 403
        ? 'Access denied: You cannot view another user\'s conversation.'
        : 'Conversation thread not found.'
    });
  }
  res.json({
    success: true,
    conversation: check.conversation
  });
});

// DELETE /api/v1/assistant/conversations/:id (Requires JWT Authentication + Ownership)
router.delete('/conversations/:id', authenticateToken, (req, res) => {
  const check = assistantService.deleteConversationWithAccessCheck(req.params.id, req.user);
  if (check.error) {
    return res.status(check.statusCode).json({
      success: false,
      error: check.error,
      message: check.statusCode === 403
        ? 'Access denied: You cannot delete another user\'s conversation.'
        : 'Conversation not found.'
    });
  }
  res.json({
    success: true,
    message: 'Conversation successfully deleted.'
  });
});

// POST /api/v1/assistant/query (Direct Hybrid Lexical RAG Retrieval — Public Knowledge Corpus)
router.post('/query', optionalAuth, assistantLimiter, (req, res) => {
  const { query, category, limit = 5 } = req.body || {};
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Field "query" is required.' });
  }
  if (query.trim().length > MAX_QUERY_CHARS) {
    return res.status(400).json({
      success: false,
      error: 'QUERY_TOO_LONG',
      message: `Field "query" exceeds maximum length of ${MAX_QUERY_CHARS} characters.`
    });
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 20);
  const results = assistantService.queryKnowledge(query.trim(), category, parsedLimit);
  res.json({
    success: true,
    query: query.trim(),
    retrieval_method: 'hybrid_lexical_bm25_char_ngram_rrf',
    total_returned: results.length,
    results
  });
});

// GET /api/v1/assistant/tools
router.get('/tools', (req, res) => {
  const tools = assistantService.getAvailableTools();
  res.json({
    success: true,
    count: tools.length,
    tools
  });
});

// POST /api/v1/assistant/tools/execute
// Requires authentication for live sensor/groundwater tools or any farm/field-scoped parameters
router.post('/tools/execute', optionalAuth, assistantLimiter, async (req, res) => {
  const { tool_name, parameters = {} } = req.body || {};
  if (!tool_name || typeof tool_name !== 'string') {
    return res.status(400).json({ success: false, error: 'Field "tool_name" is required.' });
  }
  if (parameters === null || typeof parameters !== 'object' || Array.isArray(parameters)) {
    return res.status(400).json({ success: false, error: 'Field "parameters" must be a JSON object.' });
  }

  const isTenantScopedRequest =
    PRIVATE_OR_TENANT_TOOLS.has(tool_name) ||
    Boolean(parameters?.farm_id) ||
    Boolean(parameters?.field_id) ||
    Boolean(parameters?.use_field_context);

  if (!req.user && isTenantScopedRequest) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED_FOR_PRIVATE_OR_FARM_TOOL',
      message: `Authentication required to execute '${tool_name}' or access farm/field-scoped resources.`
    });
  }

  try {
    const output = await withAssistantTimeout(assistantService.executeTool(tool_name, parameters, req.user || null));
    res.json({
      success: true,
      tool: tool_name,
      output
    });
  } catch (err) {
    const statusCode = err.statusCode || 400;
    res.status(statusCode).json({
      success: false,
      error: err.code || err.message,
      message: err.message
    });
  }
});

// POST /api/v1/assistant/feedback (Requires JWT Authentication)
router.post('/feedback', authenticateToken, (req, res) => {
  const { conversation_id, message_id, rating, comments } = req.body || {};
  if (!conversation_id || !message_id) {
    return res.status(400).json({ success: false, error: 'conversation_id and message_id are required.' });
  }

  try {
    const saved = assistantService.saveFeedback({
      conversationId: conversation_id,
      messageId: message_id,
      rating,
      comments,
      userContext: req.user
    });

    res.json({
      success: true,
      message: 'Feedback submitted successfully.',
      feedback: saved
    });
  } catch (err) {
    const statusCode = err.statusCode || 400;
    res.status(statusCode).json({
      success: false,
      error: err.code || err.message,
      message: err.message
    });
  }
});

module.exports = router;
