#!/usr/bin/env node
/**
 * Dev orchestrator: builds the shared package in watch mode and starts every
 * service that defines a `dev` script, concurrently with colored prefixes.
 *
 * Discovers services dynamically so it keeps working as services are added.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const servicesDir = path.join(root, 'services');

function hasDevScript(pkgPath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.scripts && pkg.scripts.dev ? pkg.name : null;
  } catch {
    return null;
  }
}

const targets = [];

// Shared package in watch mode first
const sharedPkg = path.join(root, 'packages', 'shared', 'package.json');
if (fs.existsSync(sharedPkg)) {
  targets.push({ name: 'shared', script: 'npm run dev -w @linkedin-clone/shared' });
}

if (fs.existsSync(servicesDir)) {
  for (const entry of fs.readdirSync(servicesDir)) {
    const pkgPath = path.join(servicesDir, entry, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const name = hasDevScript(pkgPath);
      if (name) targets.push({ name: entry, script: `npm run dev -w ${name}` });
    }
  }
}

if (targets.length === 0) {
  console.error('No dev targets found. Add services with a "dev" script.');
  process.exit(1);
}

const names = targets.map((t) => t.name).join(',');
const commands = targets.map((t) => t.script);

console.log(`Starting dev for: ${names}`);

const args = [
  'concurrently',
  '--names',
  names,
  '--prefix-colors',
  'auto',
  '--kill-others-on-fail',
  ...commands.map((c) => `${c}`),
];

const result = spawnSync('npx', args, { stdio: 'inherit', cwd: root, shell: true });
process.exit(result.status ?? 0);
