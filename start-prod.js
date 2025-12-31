#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync } from 'fs';

const PORT = process.env.PORT || '5000';

// Check if production build exists
if (!existsSync('.mastra/output/index.mjs')) {
  console.log('🔨 Building Mastra for production...');
  const build = spawn('npx', ['mastra', 'build'], {
    stdio: 'inherit',
    shell: true
  });

  build.on('exit', (code) => {
    if (code === 0) {
      startProd();
    } else {
      console.error('Build failed!');
      process.exit(1);
    }
  });
} else {
  startProd();
}

function startProd() {
  console.log('🚀 Starting production server...');
  
  const server = spawn('node', ['.mastra/output/index.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, PORT }
  });

  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    server.kill('SIGTERM');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('Interrupted...');
    server.kill('SIGINT');
    process.exit(0);
  });

  server.on('exit', (code) => {
    process.exit(code || 0);
  });
}
