#!/usr/bin/env node
import { spawn } from 'child_process';

const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
  process.exit(0);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
