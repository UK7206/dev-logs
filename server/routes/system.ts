import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

const SETTINGS_FILE = path.join(process.cwd(), 'server', 'data', 'settings.json');

function loadSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) return { webhook_url: '' };
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')); } catch { return { webhook_url: '' }; }
}

function saveSettings(settings: any) {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// Endpoint to get settings
router.get('/settings', (req: Request, res: Response) => {
  res.json({ status: 'success', settings: loadSettings() });
});

// Endpoint to update settings
router.post('/settings', (req: Request, res: Response) => {
  const current = loadSettings();
  const updated = { ...current, ...req.body };
  saveSettings(updated);
  res.json({ status: 'success', settings: updated });
});

// Endpoint to list files in a directory
router.get('/ls', (req: Request, res: Response) => {
  try {
    const dir = req.query.dir as string || process.cwd();
    if (!fs.existsSync(dir)) {
      res.status(404).json({ status: 'error', detail: 'Directory not found' });
      return;
    }
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    const files = items.map(item => ({
      name: item.name,
      isDirectory: item.isDirectory(),
      path: path.join(dir, item.name)
    }));
    
    // Sort directories first
    files.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
      return a.isDirectory ? -1 : 1;
    });

    res.json({ status: 'success', currentDir: dir, files });
  } catch (error) {
    res.status(500).json({ status: 'error', detail: (error as Error).message });
  }
});

// Endpoint to read file contents
router.get('/cat', (req: Request, res: Response) => {
  try {
    const file = req.query.file as string;
    if (!file) {
      res.status(400).json({ status: 'error', detail: 'File parameter is required' });
      return;
    }
    if (!fs.existsSync(file)) {
      res.status(404).json({ status: 'error', detail: 'File not found' });
      return;
    }
    
    const stats = fs.statSync(file);
    if (stats.size > 10 * 1024 * 1024) { // Limit to 10MB
      res.status(400).json({ status: 'error', detail: 'File too large' });
      return;
    }

    const content = fs.readFileSync(file, 'utf-8');
    res.json({ status: 'success', file, content });
  } catch (error) {
    res.status(500).json({ status: 'error', detail: (error as Error).message });
  }
});

// Endpoint to execute a command
router.post('/exec', async (req: Request, res: Response) => {
  try {
    const { command, cwd = process.cwd() } = req.body;
    
    if (!command) {
      res.status(400).json({ status: 'error', detail: 'Command is required' });
      return;
    }

    // Basic security check (though it's a local dev tool)
    if (command.includes('rm -rf /') || command.includes('del /f /s /q c:\\')) {
      res.status(400).json({ status: 'error', detail: 'Potentially dangerous command rejected' });
      return;
    }

    const { stdout, stderr } = await execAsync(command, { cwd });
    
    res.json({ 
      status: 'success', 
      command,
      cwd,
      stdout,
      stderr 
    });
  } catch (error) {
    const err = error as any;
    res.status(500).json({ 
      status: 'error', 
      detail: err.message,
      stdout: err.stdout || '',
      stderr: err.stderr || ''
    });
  }
});

export default router;
