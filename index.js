#!/usr/bin/env node

// Run TypeScript production file using tsx
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🤖 Starting Telegram Bot (Production)...');

const child = spawn('npx', ['tsx', 'src/production.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  child.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Interrupted...');
  child.kill('SIGINT');
  process.exit(0);
});

child.on('exit', (code, signal) => {
  console.log(`Process exited with code ${code} and signal ${signal}`);
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Failed to start process:', err);
  process.exit(1);
});
