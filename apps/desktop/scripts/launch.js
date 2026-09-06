const { spawn } = require('child_process');
const path = require('path');

const electronPath = require('electron');

delete process.env.ELECTRON_RUN_AS_NODE;

const cwd = path.join(__dirname, '..');
const child = spawn(electronPath, ['.'], { cwd, stdio: 'inherit' });
child.on('close', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
  console.error('Failed to start electron:', err.message);
  process.exit(1);
});
