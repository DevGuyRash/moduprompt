#!/usr/bin/env node
/**
 * Verify that the runtime Docker image contains production dependencies only.
 * Usage: pnpm docker:verify [-- --image <tag>] [--modules-path <path>]
 */
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const DEFAULT_IMAGE = process.env.DOCKER_VERIFY_IMAGE || 'moduprompt/app:verify';
const DEFAULT_MODULES_PATH = process.env.DOCKER_VERIFY_MODULES_PATH || '/srv/moduprompt/node_modules/.modules.yaml';

function parseArgs(argv) {
  let image = DEFAULT_IMAGE;
  let modulesPath = DEFAULT_MODULES_PATH;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    if (arg === '--image' || arg === '-i') {
      if (!argv[i + 1]) {
        fail('Missing value for --image');
      }
      image = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith('--image=')) {
      const value = arg.split('=')[1] ?? '';
      if (!value) {
        fail('Missing value for --image');
      }
      image = value;
      continue;
    }

    if (arg === '--modules-path' || arg === '-p') {
      if (!argv[i + 1]) {
        fail('Missing value for --modules-path');
      }
      modulesPath = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith('--modules-path=')) {
      const value = arg.split('=')[1] ?? '';
      if (!value) {
        fail('Missing value for --modules-path');
      }
      modulesPath = value;
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  return { image, modulesPath };
}

function printUsage() {
  console.log(
    'Docker runtime dependency verification' +
      '\n\nUsage:\n  pnpm docker:verify [-- --image <tag>] [--modules-path <path>]' +
      '\n\nEnvironment overrides:\n' +
      `  DOCKER_VERIFY_IMAGE        Override image tag (default: ${DEFAULT_IMAGE})\n` +
      `  DOCKER_VERIFY_MODULES_PATH Override modules manifest path (default: ${DEFAULT_MODULES_PATH})\n`,
  );
}

function fail(message, { exitCode = 1 } = {}) {
  console.error(`\n✖ ${message}`);
  process.exit(exitCode);
}

function ensureDockerAvailable() {
  const version = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], { encoding: 'utf8' });
  if (version.status !== 0) {
    fail('Docker CLI is unavailable. Ensure Docker Desktop/Engine is running and accessible in your PATH.');
  }
}

function ensureImageExists(image) {
  const inspect = spawnSync('docker', ['image', 'inspect', image], { stdio: 'ignore' });
  if (inspect.status !== 0) {
    fail(`Docker image '${image}' not found. Run "pnpm docker:build" first.`, { exitCode: 2 });
  }
}

function readModulesManifest(image, modulesPath) {
  const result = spawnSync('docker', ['run', '--rm', '--entrypoint', 'cat', image, modulesPath], { encoding: 'utf8' });
  if (result.status !== 0) {
    const details = result.stderr?.trim() || result.stdout?.trim() || '';
    const suffix = details ? `\n${details}\n` : '\n';
    fail(
      `Unable to read ${modulesPath} from image '${image}'.${suffix}` +
        'Confirm the runtime stage copies production node_modules to this path.',
    );
  }
  return result.stdout;
}

function analyzeManifest(contents) {
  if (!contents || !contents.trim()) {
    fail('node_modules manifest is empty. Build may have failed to install dependencies.');
  }

  const hasDevDeps = /^\s*dev:\s*true\b/m.test(contents);
  if (hasDevDeps) {
    fail('Detected devDependencies in runtime node_modules. Investigate pruning workflow.');
  }
}

function main() {
  const { image, modulesPath } = parseArgs(process.argv.slice(2));

  console.log('⏱  Verifying Docker runtime dependencies...');
  console.log(`   • image: ${image}`);
  console.log(`   • manifest: ${modulesPath}`);

  ensureDockerAvailable();
  ensureImageExists(image);
  const manifest = readModulesManifest(image, modulesPath);
  analyzeManifest(manifest);

  console.log('✅  Runtime dependency check passed — no devDependencies detected.');
}

main();
