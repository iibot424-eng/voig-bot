#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync } from 'fs';

const PORT = process.env.PORT || '5000';

console.log('🤖 Starting Telegram Bot...');

// For Render: use production build
// For Replit dev: can use dev server (has more memory)
const isRender = process.env.RENDER === 'true';
const isProduction = process.env.NODE_ENV === 'production';

if (isRender || isProduction) {
  console.log('📦 Using production build mode (minimal memory)');
  
  // Check if build exists
  if (!existsSync('.mastra/output/index.mjs')) {
    console.log('🔨 Building for production first...');
    const build = spawn('npx', ['mastra', 'build'], {
      stdio: 'inherit',
      shell: true
    });
    
    build.on('exit', (code) => {
      if (code === 0) {
        startProduction();
      } else {
        console.error('❌ Build failed');
        process.exit(1);
      }
    });
  } else {
    startProduction();
  }
} else {
  console.log('💻 Using development server');
  startDev();
}

function startDev() {
  const child = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env }
  });

  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    child.kill('SIGTERM');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('Interrupted...');
    child.kill('SIGINT');
    process.exit(0);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

function startProduction() {
  const child = spawn('node', ['.mastra/output/index.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, PORT }
  });

  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    child.kill('SIGTERM');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('Interrupted...');
    child.kill('SIGINT');
    process.exit(0);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}
