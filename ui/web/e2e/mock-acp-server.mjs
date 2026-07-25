/**
 * Mock ACP Server for E2E tests.
 *
 * Implements the ACP Streamable HTTP transport minimally:
 * - POST /acp : initialize (returns Acp-Connection-Id) + RPC method calls
 * - GET  /acp : connection-scoped & session-scoped SSE event streams
 * - DELETE /acp : connection cleanup
 * - GET  /status : connection probe (used by ConnectionWizard)
 *
 * Supports test scenarios via X-Test-Scenario header.
 */
import * as http from 'http';
import * as crypto from 'crypto';

// ---------------------------------------------------------------------------
// Connection & session state
// ---------------------------------------------------------------------------

let nextConnId = 1;
const connections = new Map(); // connId -> { streams, sessions, scenario }

let nextSessionId = 100;
const sessions = new Map(); // sessionId -> { messages, status }

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

function sseMsg(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function sendEvent(connId, data) {
  const conn = connections.get(connId);
  if (!conn) return;
  for (const stream of conn.streams) {
    try { sseMsg(stream, data); } catch {}
  }
}

// ---------------------------------------------------------------------------
// Request parsing
// ---------------------------------------------------------------------------

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { resolve(null); }
    });
    req.on('error', reject);
  });
}

function connIdFromReq(req) {
  return req.headers['acp-connection-id'] || null;
}

function sessionIdFromReq(req) {
  return req.headers['acp-session-id'] || null;
}

// ---------------------------------------------------------------------------
// Handle initialize POST
// ---------------------------------------------------------------------------

async function handleInitialize(req, res) {
  const body = await readBody(req);
  const connId = `conn-${nextConnId++}`;
  const scenario = req.headers['x-test-scenario'] || 'default';
  const streamTargets = [];
  connections.set(connId, { streams: streamTargets, sessions: [], scenario });

  // If auth test, check secret key
  if (scenario === 'auth-failure') {
    connections.delete(connId);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: -32001, message: 'authentication failed' } }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Acp-Connection-Id': connId,
  });
  const initializeResponse = {
    id: body?.id ?? 1,
    result: {
      protocolVersion: '0.1.0',
      serverInfo: { name: 'mock-acp', version: '0.1.0' },
      serverCapabilities: {},
    },
  };
  res.end(JSON.stringify(initializeResponse));
}

// ---------------------------------------------------------------------------
// Handle GET (SSE streams)
// ---------------------------------------------------------------------------

function handleAcpGet(req, res) {
  const connId = connIdFromReq(req);
  const sessionId = sessionIdFromReq(req);

  if (!connId || !connections.has(connId)) {
    if (req.headers['x-connection-fail'] === 'true') {
      // Simulate connection failure
      res.writeHead(503);
      res.end('Service unavailable');
      return;
    }
    res.writeHead(404);
    res.end('Unknown connection');
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const conn = connections.get(connId);
  conn.streams.push(res);

  // Send an initial "connected" event
  sseMsg(res, {
    id: 0,
    result: { status: 'connected' },
  });

  // Keep alive
  const keepAlive = setInterval(() => {
    res.write(':keepalive\n\n');
  }, 5000);

  req.on('close', () => {
    clearInterval(keepAlive);
    const idx = conn.streams.indexOf(res);
    if (idx >= 0) conn.streams.splice(idx, 1);
  });
}

// ---------------------------------------------------------------------------
// Handle POST (RPC calls)
// ---------------------------------------------------------------------------

async function handleAcpPost(req, res) {
  const connId = connIdFromReq(req);
  const body = await readBody(req);

  // For testing auth failure at connect step (before initialize is done)
  if (req.headers['x-test-scenario'] === 'auth-failure') {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: -32001, message: 'authentication failed' } }));
    return;
  }

  if (!connId || !connections.has(connId)) {
    res.writeHead(404);
    res.end('Unknown connection');
    return;
  }

  const conn = connections.get(connId);
  const method = body?.method;
  const id = body?.id;
  const params = body?.params || {};
  const scenario = conn.scenario;

  // Respond to POST with 202 Accepted (Streamable HTTP)
  res.writeHead(202);
  res.end();

  // Handle the RPC call and send response via SSE
  if (method === 'initialize') {
    // Already handled above in the first POST
    return;
  }

  if (method === 'newSession') {
    const sessionId = `sess-${nextSessionId++}`;
    sessions.set(sessionId, { messages: [], status: 'idle' });
    conn.sessions.push(sessionId);

    sendEvent(connId, { id, result: { sessionId } });

    // Simulate session created notification
    setTimeout(() => {
      sendEvent(connId, {
        method: 'session/update',
        params: {
          sessionId,
          status: 'idle',
          messages: [],
        },
      });
    }, 50);
    return;
  }

  if (method === 'session/load') {
    const sessionId = params.sessionId;
    const session = sessions.get(sessionId);
    if (!session) {
      sendEvent(connId, { id, error: { code: -32002, message: 'session not found' } });
      return;
    }
    sendEvent(connId, {
      id,
      result: {
        sessionId,
        messages: session.messages,
      },
    });
    return;
  }

  if (method === 'listSessions') {
    const list = Array.from(sessions.entries()).map(([sid, s]) => ({
      sessionId: sid,
      title: s.messages[0]?.content?.slice(0, 30) || 'Mock session',
      updatedAt: new Date().toISOString(),
      status: s.status,
    }));
    sendEvent(connId, { id, result: { sessions: list } });
    return;
  }

  if (method === 'session/prompt') {
    const sessionId = params.sessionId;
    const content = params.content || '';

    if (!sessions.has(sessionId)) {
      sendEvent(connId, { id, error: { code: -32002, message: 'session not found' } });
      return;
    }

    // Store user message
    const session = sessions.get(sessionId);
    session.messages.push({ role: 'user', content });

    let msgId = `msg-${Date.now()}`;

    // Simulate assistant streaming
    simulateStreaming(connId, sessionId, msgId, scenario, () => {
      // After streaming: if permission scenario, request permission
      if (scenario === 'permission') {
        const permId = `perm-${Date.now()}`;
        sendEvent(connId, {
          method: 'session/update',
          params: {
            sessionId,
            notification: {
              type: 'requestPermission',
              requestId: permId,
              toolCall: {
                toolCallId: 'tool-1',
                title: 'read_file',
                content: [{ type: 'content', content: { type: 'text', text: 'Read file /etc/passwd' } }],
              },
              options: [
                { optionId: 'allow-once', kind: 'allowOnce', name: 'Allow Once' },
                { optionId: 'allow-always', kind: 'allowAlways', name: 'Always Allow' },
                { optionId: 'deny-once', kind: 'denyOnce', name: 'Deny Once' },
              ],
            },
          },
        });
      }

      // For interruption test, don't send message-complete
      if (scenario === 'interrupt') {
        return;
      }

      // Send completion notification
      setTimeout(() => {
        sendEvent(connId, {
          method: 'session/update',
          params: {
            sessionId,
            notification: {
              type: 'messageComplete',
              messageId: msgId,
            },
          },
        });
      }, scenario === 'interrupt' ? 50000 : 200);
    });
    return;
  }

  if (method === 'session/cancel') {
    const sessionId = params.sessionId;
    sendEvent(connId, {
      id,
      result: { status: 'cancelled' },
    });
    setTimeout(() => {
      sendEvent(connId, {
        method: 'session/update',
        params: {
          sessionId,
          notification: { type: 'cancelled' },
        },
      });
    }, 100);
    return;
  }

  if (method === 'session/update') {
    const sessionId = params.sessionId;
    sendEvent(connId, { id, result: { status: 'updated' } });
    return;
  }

  // Unknown method
  sendEvent(connId, { id, error: { code: -32601, message: `Method not found: ${method}` } });
}

function simulateStreaming(connId, sessionId, msgId, scenario, onDone) {
  const responses = {
    default: '你好！我是 Mock ACP 助手。我可以帮助你完成各种任务。\n\n有什么我可以帮你的吗？',
    permission: '我需要读取一个文件来继续。',
    interrupt: '这是一条会被中断的消息。',
    tool: '让我查询一下数据。\n\n查询结果如下：\n- 项目 A：完成\n- 项目 B：进行中\n- 项目 C：待开始',
  };

  const text = responses[scenario] || responses.default;
  let idx = 0;
  const interval = setInterval(() => {
    if (idx >= text.length) {
      clearInterval(interval);
      // Send tool call if tool scenario
      if (scenario === 'tool') {
        setTimeout(() => {
          sendEvent(connId, {
            method: 'session/update',
            params: {
              sessionId,
              notification: {
                type: 'toolCall',
                toolCallId: 'tool-1',
                title: 'query_data',
                content: [{ type: 'content', content: { type: 'text', text: 'Querying data...' } }],
              },
            },
          });
          // Then send tool result
          setTimeout(() => {
            sendEvent(connId, {
              method: 'session/update',
              params: {
                sessionId,
                notification: {
                  type: 'toolResult',
                  toolCallId: 'tool-1',
                  content: [{ type: 'content', content: { type: 'text', text: 'Query completed successfully' } }],
                },
              },
            });
          }, 300);
        }, 200);
      }
      onDone();
      return;
    }
    const chunk = text.slice(idx, idx + 3);
    idx += 3;
    sendEvent(connId, {
      method: 'session/update',
      params: {
        sessionId,
        notification: {
          type: 'messageChunk',
          messageId: msgId,
          content: chunk,
          status: 'inProgress',
        },
      },
    });
  }, 50);
}

// ---------------------------------------------------------------------------
// Handle DELETE
// ---------------------------------------------------------------------------

function handleAcpDelete(req, res) {
  const connId = connIdFromReq(req);
  if (connId && connections.has(connId)) {
    const conn = connections.get(connId);
    for (const stream of conn.streams) {
      try { stream.end(); } catch {}
    }
    connections.delete(connId);
  }
  res.writeHead(200);
  res.end('OK');
}

// ---------------------------------------------------------------------------
// Status endpoint
// ---------------------------------------------------------------------------

function handleStatus(req, res) {
  const secretKey = req.headers['x-secret-key'];
  // For auth-failure test scenario, check header
  if (req.headers['x-test-scenario'] === 'auth-failure') {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'authentication failed' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', version: '0.1.0' }));
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

export function createMockServer(port = 0) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (path === '/status') return handleStatus(req, res);
      if (path === '/acp') {
        if (req.method === 'POST') {
          // Check if this is an initialize (no connection id yet)
          const connId = connIdFromReq(req);
          if (!connId) return handleInitialize(req, res);
          return handleAcpPost(req, res);
        }
        if (req.method === 'GET') return handleAcpGet(req, res);
        if (req.method === 'DELETE') return handleAcpDelete(req, res);
      }
      res.writeHead(404);
      res.end('Not found');
    } catch (err) {
      console.error('Mock server error:', err);
      res.writeHead(500);
      res.end('Internal server error');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      const addr = server.address();
      const actualPort = typeof addr === 'object' ? addr.port : port;
      resolve({ server, port: actualPort });
    });
  });
}

// CLI entry point
const isMain = process.argv[1]?.endsWith('mock-acp-server.mjs');
if (isMain) {
  const port = parseInt(process.env.MOCK_ACP_PORT || '3001', 10);
  const { server } = await createMockServer(port);
  console.log(`Mock ACP server listening on port ${port}`);
}
