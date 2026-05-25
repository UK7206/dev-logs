import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import requestRoutes from './routes/requests.js';
import systemRoutes from './routes/system.js';
import aiRoutes from './routes/ai.js';
import { db } from './db.js'; // Triggers DB setup & migration

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = parseInt(process.env.PORT || '4445', 10);

// ---------------------------------------------------------------------------
// Socket.io - Real-time multiplayer collaboration
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  console.log('[dev-logs] Client connected via Socket.io:', socket.id);
  
  socket.on('cursor-move', (data) => {
    socket.broadcast.emit('cursor-move', { ...data, id: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('[dev-logs] Client disconnected:', socket.id);
    socket.broadcast.emit('cursor-remove', { id: socket.id });
  });
});

// ---------------------------------------------------------------------------
// SSE client registry — broadcast real-time events to the dashboard
// ---------------------------------------------------------------------------
export const sseClients = new Set<Response>();

export function broadcastEvent(event: string, data: unknown) {
  // Broadcast via SSE (legacy)
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
  
  // Broadcast via Socket.io
  io.emit('dev-logs-event', { event, data });
}

// ---------------------------------------------------------------------------
// Webhook — fire-and-forget POST to configured URL
// ---------------------------------------------------------------------------
export async function fireWebhook(event: string, payload: Record<string, unknown>) {
  const settingsFile = path.join(__dirname, 'data', 'settings.json');
  let webhookUrl  = process.env.DEV_LOGS_WEBHOOK_URL || '';
  let webhookType = 'custom';
  let webhookName = 'dev-logs';

  try {
    if (fs.existsSync(settingsFile)) {
      const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
      if (settings.webhook_url)    webhookUrl  = settings.webhook_url;
      if (settings.webhook_type)   webhookType = settings.webhook_type;
      if (settings.webhook_name)   webhookName = settings.webhook_name;

      // Check if this event is enabled
      const enabledEvents: string[] = settings.webhook_events ?? [];
      if (enabledEvents.length > 0 && !enabledEvents.includes(event)) return;
    }
  } catch { /* ignore */ }

  if (!webhookUrl) return;

  // Build rich payload per platform
  const EVENT_COLORS: Record<string, number> = {
    request_created: 0x22c55e,
    status_change:   0x3b82f6,
    priority_change: 0xf59e0b,
    comment_added:   0xa855f7,
    attachment_added: 0x06b6d4,
  };

  const EVENT_EMOJIS: Record<string, string> = {
    request_created:  '🐛',
    status_change:    '🔄',
    priority_change:  '⚡',
    comment_added:    '💬',
    attachment_added: '📎',
  };

  const emoji = EVENT_EMOJIS[event] ?? '📌';
  const title = payload.title as string ?? 'dev-logs Event';
  const reqId = payload.id as string ?? payload.request_id as string ?? '';

  let body: Record<string, unknown>;

  if (webhookType === 'discord') {
    const fields: { name: string; value: string; inline?: boolean }[] = [];
    if (reqId)              fields.push({ name: 'ID',       value: `\`${reqId}\``,                       inline: true });
    if (payload.priority)   fields.push({ name: 'Priority', value: String(payload.priority),              inline: true });
    if (payload.status)     fields.push({ name: 'Status',   value: String(payload.status),               inline: true });
    if (payload.old_status) fields.push({ name: 'Status',   value: `${payload.old_status} → ${payload.new_status}`, inline: false });

    body = {
      username: webhookName,
      embeds: [{
        title:       `${emoji} ${event.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: ${title}`,
        color:       EVENT_COLORS[event] ?? 0x22d3ee,
        fields,
        footer:      { text: `dev-logs · ${new Date().toLocaleDateString()}` },
        timestamp:   new Date().toISOString(),
      }],
    };
  } else if (webhookType === 'slack') {
    body = {
      username: webhookName,
      text:     `${emoji} *${event.replace(/_/g, ' ')}*: ${title}`,
      attachments: [{
        color:  '#' + ((EVENT_COLORS[event] ?? 0x22d3ee).toString(16).padStart(6, '0')),
        fields: [
          reqId && { title: 'ID', value: reqId, short: true },
          payload.priority && { title: 'Priority', value: String(payload.priority), short: true },
          payload.status   && { title: 'Status',   value: String(payload.status),  short: true },
        ].filter(Boolean),
        footer: 'dev-logs',
        ts:     Math.floor(Date.now() / 1000),
      }],
    };
  } else {
    body = { event, ...payload, _source: webhookName, _timestamp: new Date().toISOString() };
  }

  try {
    await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
  } catch (err) {
    console.warn('[dev-logs] Webhook delivery failed:', (err as Error).message);
  }
}


// Middleware
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// GET /api/events — SSE stream for real-time dashboard updates
// ---------------------------------------------------------------------------
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send heartbeat immediately so the browser knows it connected
  res.write(': heartbeat\n\n');

  sseClients.add(res);

  // Keep-alive ping every 25 seconds
  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(res);
    }
  }, 25_000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

// Serve uploaded attachments
const attachmentsDir = path.join(__dirname, 'data', 'attachments');
app.use('/uploads', express.static(attachmentsDir));

// Serve overlay.js
app.get('/overlay.js', (_req, res) => {
  const distOverlay = path.join(__dirname, '..', 'dist', 'overlay.js');
  if (fs.existsSync(distOverlay)) {
    res.sendFile(distOverlay);
  } else {
    res.type('application/javascript').send('// overlay.js placeholder — build with: npm run build:overlay\n');
  }
});

// Mount API routes
app.use('/api/requests', requestRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/ai', aiRoutes);

// Create data directories on startup
const dataDir = path.join(__dirname, 'data');
const dirs = [dataDir, attachmentsDir];
for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`dev-logs server running on http://localhost:${PORT}`);
  console.log(`Socket.io server attached for real-time collaboration`);
});
