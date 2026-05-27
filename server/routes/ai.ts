// @ts-nocheck
import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// ---------------------------------------------------------------------------
// Keyword maps for smart triage
// ---------------------------------------------------------------------------
const PRIORITY_KEYWORDS: Record<string, string[]> = {
  critical: ['crash', 'down', 'broken', 'not working', 'error', 'exception', 'fail', 'production', 'urgent', 'critical', 'data loss', 'security', 'outage', 'breach', '500', 'null pointer', 'undefined', 'cannot read'],
  high: ['bug', 'wrong', 'incorrect', 'missing', 'slow', 'performance', 'memory', 'leak', 'regression', 'blocked', 'stuck', 'loop', 'infinite', 'freeze', 'hung'],
  medium: ['improve', 'enhancement', 'better', 'update', 'change', 'refactor', 'cleanup', 'optimize', 'warning', 'deprecated', 'todo'],
  low: ['typo', 'style', 'color', 'font', 'spacing', 'minor', 'cosmetic', 'nice to have', 'suggestion', 'idea', 'future', 'wishlist'],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  bug: ['bug', 'error', 'crash', 'broken', 'not working', 'fail', 'wrong', 'incorrect', 'exception', 'undefined', 'null', 'cannot', 'doesn\'t work', 'does not work', 'issue', 'problem'],
  'ui-ux': ['ui', 'ux', 'design', 'layout', 'style', 'color', 'font', 'spacing', 'responsive', 'mobile', 'dark mode', 'theme', 'icon', 'button', 'animation', 'hover', 'looks', 'visual', 'display', 'alignment', 'padding', 'margin'],
  feature: ['feature', 'add', 'new', 'implement', 'support', 'allow', 'enable', 'integrate', 'build', 'create', 'make', 'want', 'need', 'should', 'can we'],
  enhancement: ['improve', 'enhancement', 'better', 'optimize', 'faster', 'refactor', 'cleanup', 'update', 'upgrade', 'performance'],
};

const TAG_KEYWORDS: Record<string, string[]> = {
  auth: ['login', 'logout', 'auth', 'authentication', 'password', 'token', 'session', 'jwt', 'oauth', 'signup', 'sign in', 'sign up'],
  api: ['api', 'endpoint', 'request', 'response', 'http', 'fetch', 'axios', 'rest', 'graphql', 'websocket', 'cors'],
  database: ['database', 'db', 'sql', 'query', 'sqlite', 'postgres', 'mysql', 'mongo', 'data', 'migration'],
  performance: ['slow', 'fast', 'performance', 'speed', 'lag', 'fps', 'memory', 'cpu', 'load', 'optimize', 'cache'],
  mobile: ['mobile', 'ios', 'android', 'responsive', 'phone', 'tablet', 'touch'],
  ui: ['ui', 'ux', 'design', 'layout', 'style', 'css', 'tailwind', 'component', 'button', 'modal', 'form'],
  security: ['security', 'auth', 'xss', 'csrf', 'injection', 'vulnerability', 'permission', 'access', 'role'],
  testing: ['test', 'testing', 'unit test', 'e2e', 'integration', 'coverage', 'jest', 'cypress'],
  deployment: ['deploy', 'deployment', 'build', 'ci', 'cd', 'docker', 'kubernetes', 'server', 'production', 'staging'],
  notification: ['notification', 'email', 'sms', 'push', 'alert', 'toast', 'message'],
};

function scoreKeywords(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) score++;
  }
  return score;
}

function generateSmartTitle(description: string): string {
  const firstLine = description.trim().split('\n')[0];
  // Remove markdown artifacts from context block
  const cleaned = firstLine.replace(/---.*$/s, '').trim();
  
  // Capitalize first letter, limit to 80 chars
  const title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (title.length <= 80) return title;
  
  // Truncate at word boundary
  const truncated = title.slice(0, 80);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 50 ? truncated.slice(0, lastSpace) + '…' : truncated + '…';
}

function suggestPriority(description: string, consoleErrors: number = 0): { priority: string; confidence: number; reason: string } {
  const text = description.toLowerCase();
  
  // If there are console errors, bump priority
  if (consoleErrors > 3) {
    return { priority: 'critical', confidence: 0.9, reason: `${consoleErrors} console errors detected` };
  }
  if (consoleErrors > 0) {
    return { priority: 'high', confidence: 0.8, reason: `${consoleErrors} console error(s) detected` };
  }

  const scores: Record<string, number> = {};
  for (const [prio, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    scores[prio] = scoreKeywords(text, keywords);
  }

  const sorted = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    return { priority: 'medium', confidence: 0.5, reason: 'No specific priority signals detected' };
  }

  const [best, bestScore] = sorted[0];
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = Math.min(0.95, bestScore / total + 0.3);

  const reasons: Record<string, string> = {
    critical: 'Contains crash/failure keywords',
    high: 'Contains bug/regression keywords',
    medium: 'Contains improvement keywords',
    low: 'Contains minor/cosmetic keywords',
  };

  return { priority: best, confidence, reason: reasons[best] || 'Keyword analysis' };
}

function suggestCategory(description: string): { category: string; confidence: number } {
  const text = description.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[cat] = scoreKeywords(text, keywords);
  }

  const sorted = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    return { category: 'feature', confidence: 0.4 };
  }

  const [best, bestScore] = sorted[0];
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = Math.min(0.95, bestScore / total + 0.2);

  return { category: best, confidence };
}

function suggestTags(description: string): string[] {
  const text = description.toLowerCase();
  const matched: string[] = [];

  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    const score = scoreKeywords(text, keywords);
    if (score > 0) matched.push(tag);
  }

  return matched.slice(0, 5); // max 5 auto-tags
}

function findSimilarRequests(description: string, limit = 3): any[] {
  const words = description
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 4)
    .slice(0, 20);

  if (words.length === 0) return [];

  try {
    const rows = db
      .prepare("SELECT data FROM requests WHERE status NOT IN ('completed', 'cancelled') ORDER BY created_at DESC LIMIT 50")
      .all() as { data: string }[];

    const candidates = rows.map((r) => JSON.parse(r.data));

    return candidates
      .map((req) => {
        const text = `${req.title} ${req.description}`.toLowerCase();
        let matches = 0;
        for (const w of words) {
          if (text.includes(w)) matches++;
        }
        return { req, score: words.length > 0 ? matches / words.length : 0 };
      })
      .filter((x) => x.score >= 0.35)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => ({
        id: x.req.id,
        title: x.req.title,
        status: x.req.status,
        priority: x.req.priority,
        similarity: Math.round(x.score * 100),
      }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// POST /api/ai/triage — Smart triage suggestions
// ---------------------------------------------------------------------------
router.post('/triage', (req: Request, res: Response) => {
  const { description, console_errors = 0 } = req.body;

  if (!description || typeof description !== 'string' || description.trim().length < 5) {
    res.status(400).json({ status: 'error', detail: 'description is required (min 5 chars)' });
    return;
  }

  const smartTitle = generateSmartTitle(description);
  const prioritySuggestion = suggestPriority(description, Number(console_errors));
  const categorySuggestion = suggestCategory(description);
  const suggestedTags = suggestTags(description);
  const similarRequests = findSimilarRequests(description);

  res.json({
    status: 'success',
    triage: {
      title: smartTitle,
      priority: prioritySuggestion,
      category: categorySuggestion,
      tags: suggestedTags,
      similar_requests: similarRequests,
      analyzed_at: new Date().toISOString(),
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/ai/suggest-fix/:id — AI fix suggestion for existing request
// ---------------------------------------------------------------------------
router.post('/suggest-fix/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT data FROM requests WHERE id = ?').get(req.params.id) as { data: string } | undefined;
  if (!row) {
    res.status(404).json({ status: 'error', detail: `Request ${req.params.id} not found` });
    return;
  }

  const request = JSON.parse(row.data);
  const desc = request.description as string || '';
  const category = request.category as string;
  const priority = request.priority as string;

  const errorsMatch = desc.match(/\*\*Console Errors\*\*:\s*(\d+)/);
  const hasErrors = errorsMatch && parseInt(errorsMatch[1]) > 0;

  const logsMatch = desc.match(/\*\*Console Logs\*\*:\s*```([\s\S]*?)```/);
  const logs = logsMatch ? logsMatch[1].trim() : '';

  const networkMatch = desc.match(/\*\*Network Requests\*\*:\s*```([\s\S]*?)```/);
  const network = networkMatch ? networkMatch[1].trim() : '';

  let steps: string[] = [];
  let codeExample = '';
  let rootCause = '';

  if (hasErrors && logs) {
    rootCause = 'Runtime JavaScript errors detected in console logs.';
    steps = [
      'Open browser DevTools → Console tab to see full error stack',
      'Add try/catch around the failing code block',
      'Check if async operations have proper error handling',
      'Verify all referenced variables/props are defined before use',
      'Add null-checks or optional chaining (`?.`) for object access',
    ];
    codeExample = `// Defensive null-check pattern
const value = data?.property ?? defaultValue;

// Error boundary for React components
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <ErrorFallback />;
    return this.props.children;
  }
}`;
  } else if (category === 'ui-ux' || category === 'ui') {
    rootCause = 'UI/UX layout or visual issue.';
    steps = [
      'Inspect element with DevTools to find the problematic CSS',
      'Check responsive breakpoints (mobile first)',
      'Verify flex/grid layout properties on container elements',
      'Check z-index stacking for overlapping elements',
      'Test across different screen sizes and browsers',
    ];
    codeExample = `/* Responsive flex container */
.container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

@media (max-width: 768px) {
  .container {
    flex-direction: column;
  }
}`;
  } else if (category === 'bug') {
    rootCause = 'Bug in application logic or data flow.';
    steps = [
      'Reproduce the bug in isolation with minimal test case',
      'Check Network tab for failed API requests',
      'Add console.log at key checkpoints to trace execution',
      'Verify state management (React state, Redux, Zustand, etc.)',
      'Check if the issue is environment-specific (dev vs prod)',
    ];
    codeExample = `// Debug pattern — trace state changes
console.log('[Debug] Props:', props);
console.log('[Debug] State before:', state);

// Check async data loading
useEffect(() => {
  const controller = new AbortController();
  fetchData(controller.signal)
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') console.error(err);
    });
  return () => controller.abort();
}, [dep]);`;
  } else if (category === 'feature') {
    rootCause = 'New feature implementation needed.';
    steps = [
      'Define acceptance criteria and user stories first',
      'Break down into smaller sub-tasks in the checklist',
      'Identify which components/APIs need modification',
      'Write the feature in a feature branch',
      'Add tests before merging to main',
    ];
    codeExample = `// Feature flag pattern for safe rollout
const FEATURE_FLAGS = {
  newFeature: process.env.VITE_FEATURE_NEW === 'true',
};

// In component
if (FEATURE_FLAGS.newFeature) {
  return <NewFeatureComponent />;
}
return <LegacyComponent />;`;
  } else {
    rootCause = 'General improvement or enhancement.';
    steps = [
      'Review current implementation to understand scope',
      'Identify quick wins vs long-term changes',
      'Create a checklist of sub-tasks',
      'Consider performance impact of changes',
      'Update documentation after implementation',
    ];
    codeExample = `// Performance optimization example
const ExpensiveComponent = React.memo(({ data }) => {
  const processed = useMemo(
    () => processData(data),
    [data]
  );
  return <Display items={processed} />;
});`;
  }

  if (network) {
    steps.push('Review failed network requests in the Network section of this ticket');
  }

  if (priority === 'critical') {
    steps.unshift('⚠️ CRITICAL: Consider immediate hotfix or rollback while investigating');
  }

  res.json({
    status: 'success',
    suggestion: {
      root_cause: rootCause,
      steps,
      code_example: codeExample,
      has_console_errors: !!hasErrors,
      has_network_logs: !!network,
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/ai/webhook-test — fire a real test ping to the configured URL
// ---------------------------------------------------------------------------
router.post('/webhook-test', async (req: Request, res: Response) => {
  const { url, type = 'custom', name = 'dev-logs' } = req.body;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ status: 'error', detail: 'url is required' });
    return;
  }

  // Build payload based on platform
  let payload: Record<string, unknown>;

  if (type === 'discord') {
    payload = {
      username: name,
      avatar_url: 'https://raw.githubusercontent.com/hemangjoshi37a/dev-logs/main/public/favicon.svg',
      embeds: [{
        title: '🐛 dev-logs Test Ping',
        description: 'Your webhook is connected and working correctly!',
        color: 0x22d3ee, // cyan
        fields: [
          { name: 'Event',  value: '`webhook_test`',  inline: true },
          { name: 'Status', value: '✅ Connected',     inline: true },
          { name: 'Source', value: name,               inline: true },
        ],
        footer: { text: 'dev-logs · AI-centric bug tracking' },
        timestamp: new Date().toISOString(),
      }],
    };
  } else if (type === 'slack') {
    payload = {
      username: name,
      text: '🐛 *dev-logs Test Ping*',
      attachments: [{
        color: '#22d3ee',
        fields: [
          { title: 'Event',  value: '`webhook_test`', short: true },
          { title: 'Status', value: '✅ Connected',    short: true },
        ],
        footer: 'dev-logs · AI-centric bug tracking',
        ts: Math.floor(Date.now() / 1000),
      }],
    };
  } else {
    // Generic JSON
    payload = {
      event: 'webhook_test',
      source: name,
      status: 'connected',
      message: 'dev-logs webhook test ping — everything is working!',
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok || response.status === 204) {
      res.json({ status: 'success', http_status: response.status, message: 'Test ping delivered' });
    } else {
      const text = await response.text().catch(() => '');
      res.status(502).json({
        status: 'error',
        detail: `Webhook returned HTTP ${response.status}: ${text.slice(0, 200)}`,
        http_status: response.status,
      });
    }
  } catch (err) {
    res.status(502).json({ status: 'error', detail: `Delivery failed: ${(err as Error).message}` });
  }
});

// Helper to load settings (same as system.ts)
const SETTINGS_FILE = path.join(process.cwd(), 'server', 'data', 'settings.json');
function getApiKeySettings() {
  if (!fs.existsSync(SETTINGS_FILE)) return { gemini_api_key: '' };
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch {
    return { gemini_api_key: '' };
  }
}

// POST /agent-chat — Interactive LLM agent chat
router.post('/agent-chat', async (req: Request, res: Response) => {
  const { messages, request_context, attached_files = [] } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ status: 'error', detail: 'messages array is required' });
    return;
  }

  // Load API Key
  const settings = getApiKeySettings();
  const geminiApiKey = settings.gemini_api_key || process.env.GEMINI_API_KEY || '';

  // Prepare workspace contexts
  let workspaceContext = '';
  for (const filePath of attached_files) {
    try {
      const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
      if (fs.existsSync(absPath)) {
        const stats = fs.statSync(absPath);
        if (stats.isFile() && stats.size < 1 * 1024 * 1024) { // Only read files < 1MB
          const content = fs.readFileSync(absPath, 'utf-8');
          const relPath = path.relative(process.cwd(), absPath);
          workspaceContext += `\n--- FILE: ${relPath} ---\n${content}\n`;
        }
      }
    } catch (e) {
      console.warn(`[dev-logs] Agent failed to read attached file ${filePath}:`, e);
    }
  }

  // Prepare system prompt
  const systemPrompt = `You are "dev-logs AI Agent", a senior full-stack AI developer assistant running locally inside the developer's workspace.
Your task is to help developers analyze, debug, and patch bugs or features reported in their dev-logs tickets.

Current Developer Workspace Root: ${process.cwd()}

\${request_context ? \`
--- ACTIVE DEV-LOGS TICKET DETAILS ---
ID: \${request_context.id}
Title: \&quot;\${request_context.title}\&quot;
Category: \${request_context.category}
Priority: \${request_context.priority}
Status: \${request_context.status}
Description:
\${request_context.description}
\` : ''}

--- ATTACHED WORKSPACE FILES ---
These are actual files from the developer's local project that they have shared with you for context:
\${workspaceContext || 'No files attached yet.'}

--- OUTPUT GUIDELINES ---
1. Be concise, highly professional, and extremely helpful.
2. Provide concrete explanations of root causes, steps to reproduce, and recommended fixes.
3. If you recommend a code change or patch, you MUST specify it using the following format:
   [PATCH: path/to/file]
   \`\`\`[language]
   [full new content of the file or specific code block]
   \`\`\`
   The relative file path MUST match the workspace structure so the developer can apply it with a single click.
4. When writing code, provide clean, robust, well-commented code. Keep changes minimal but complete.`;

  if (geminiApiKey) {
    try {
      // Format messages for Gemini API
      const contents = messages.map((m: any) => {
        return {
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        };
      });

      const body = {
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192
        }
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API returned status \${response.status}: \${errorText}`);
      }

      const json = await response.json();
      const aiResponseText = json.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      
      res.json({
        status: 'success',
        message: {
          role: 'assistant',
          content: aiResponseText
        }
      });
      return;
    } catch (err: any) {
      console.error('[dev-logs] Gemini API call failed:', err);
      res.json({
        status: 'success',
        message: {
          role: 'assistant',
          content: `⚠️ **Gemini API Error:** \${err.message}\\n\\nFalling back to local smart diagnostic agent for this turn.\\n\\nHere is a diagnostic plan:\\n1. Verify your Gemini API Key in Settings is correct and has quota.\\n2. Let's look at the problem details:\\n\\nBased on your ticket *\${request_context?.title || 'General Query'}*, the issue seems to be in the code structure. Let's analyze the attached files.`
        }
      });
      return;
    }
  } else {
    // smart mock AI fallback when no key is set
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    let mockReply = '';

    if (lastUserMsg.toLowerCase().includes('help') || lastUserMsg.toLowerCase().includes('hello')) {
      mockReply = `Hello! I am your **AI Workspace Agent**. 

I have full read-access to your workspace files and can write patches to fix your bugs.
To get started, you can:
1. Select an **active dev-logs ticket** in the left panel to load its context.
2. Select and **attach workspace files** that are relevant to this ticket.
3. Ask me to "Write a fix for this bug" or "Explain this file".

*Note: Please configure a **Gemini API Key** in the settings below to unlock live, real-world AI debugging! Currently running in local simulated mode.*`;
    } else if (request_context) {
      const escapedTitle = request_context.title.replace(/"/g, '\\"');
      mockReply = `I have analyzed the ticket **\${request_context.id}: \${escapedTitle}** and the attached workspace files.

### 🔍 Diagnostic Analysis
- **Context:** The ticket is categorized as a **\${request_context.category}** with **\${request_context.priority}** priority.
- **Root Cause:** Based on the context, there is a mismatch or missing state variable in your layout component.
- **Recommended Action:** Update the layout file to ensure proper loading state and error margins.

I have generated a suggested code patch below. You can apply it to your workspace using the button on the right!

[PATCH: src/components/AISuggestPanel.tsx]
\`\`\`typescript
// AI Suggested patch to improve the suggest panel container
// Added defensive check for undefined or empty descriptions
import React, { useEffect, useRef, useState } from 'react';
// ... rest of AI Suggest Panel content ...
\`\`\``;
    } else {
      mockReply = `I am ready to help! Please select a bug ticket or attach files from your project.

Once you attach a file, I can read its source code and generate a tailored patch to fix your problems.
To get real-world answers, please add a **Gemini API Key** in the AI Settings block.`;
    }

    setTimeout(() => {
      res.json({
        status: 'success',
        message: {
          role: 'assistant',
          content: mockReply
        }
      });
    }, 1000);
  }
});

export default router;

