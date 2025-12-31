#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🤖 Starting Telegram Bot...');

const child = spawn('npm', ['run', 'dev'], {
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
  console.log(`Bot exited with code ${code} and signal ${signal}`);
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
