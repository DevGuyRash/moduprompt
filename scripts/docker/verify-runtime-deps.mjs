#!/usr/bin/env node
/**
 * Docker runtime dependency verification.
 * Emits machine-readable JSON so CI can parse results while remaining
 * concise for local runs. The script checks that the target runtime image
 * exists, exposes the pnpm modules manifest, and contains production-only
 * dependencies (no entries marked with `dev: true`).
 */
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import process from 'node:process';

const DEFAULT_IMAGE = process.env.DOCKER_VERIFY_IMAGE || 'moduprompt/app:verify';
const DEFAULT_MODULES_PATH =
  process.env.DOCKER_VERIFY_MODULES_PATH || '/srv/moduprompt/node_modules/.modules.yaml';
const DEFAULT_STATIC_ROOT = process.env.DOCKER_VERIFY_STATIC_ROOT || '/srv/moduprompt/apps/web/dist';

class CheckError extends Error {
  constructor(message, { check = 'verification', data = {}, exitCode = 1 } = {}) {
    super(message);
    this.name = 'CheckError';
    this.check = check;
    this.data = data;
    this.exitCode = exitCode;
  }
}

function parseArgs(argv) {
  let image = DEFAULT_IMAGE;
  let modulesPath = DEFAULT_MODULES_PATH;
  let help = false;
  let staticRoot = DEFAULT_STATIC_ROOT;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }

    if (arg === '--image' || arg === '-i') {
      const value = argv[i + 1];
      if (!value) {
        throw new CheckError('Missing value for --image', { check: 'args', exitCode: 64 });
      }
      image = value;
      i += 1;
      continue;
    }

    if (arg.startsWith('--image=')) {
      const value = arg.slice('--image='.length);
      if (!value) {
        throw new CheckError('Missing value for --image', { check: 'args', exitCode: 64 });
      }
      image = value;
      continue;
    }

    if (arg === '--modules-path' || arg === '-p') {
      const value = argv[i + 1];
      if (!value) {
        throw new CheckError('Missing value for --modules-path', { check: 'args', exitCode: 64 });
      }
      modulesPath = value;
      i += 1;
      continue;
    }

    if (arg.startsWith('--modules-path=')) {
      const value = arg.slice('--modules-path='.length);
      if (!value) {
        throw new CheckError('Missing value for --modules-path', { check: 'args', exitCode: 64 });
      }
      modulesPath = value;
      continue;
    }

    if (arg === '--static-root' || arg === '-s') {
      const value = argv[i + 1];
      if (!value) {
        throw new CheckError('Missing value for --static-root', { check: 'args', exitCode: 64 });
      }
      staticRoot = value;
      i += 1;
      continue;
    }

    if (arg.startsWith('--static-root=')) {
      const value = arg.slice('--static-root='.length);
      if (!value) {
        throw new CheckError('Missing value for --static-root', { check: 'args', exitCode: 64 });
      }
      staticRoot = value;
      continue;
    }

    throw new CheckError(`Unknown argument: ${arg}`, { check: 'args', exitCode: 64 });
  }

  return { help, image, modulesPath, staticRoot };
}

function printUsage() {
  const lines = [
    'Docker runtime dependency verification',
    '',
    'Usage:',
    '  pnpm docker:verify [-- --image <tag>] [--modules-path <path>] [--static-root <path>]',
    '',
    'Environment overrides:',
    `  DOCKER_VERIFY_IMAGE        Override image tag (default: ${DEFAULT_IMAGE})`,
    `  DOCKER_VERIFY_MODULES_PATH Override manifest path (default: ${DEFAULT_MODULES_PATH})`,
    `  DOCKER_VERIFY_STATIC_ROOT  Override static root directory (default: ${DEFAULT_STATIC_ROOT})`,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

function ensureDockerAvailable() {
  const version = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], {
    encoding: 'utf8',
  });

  if (version.status !== 0) {
    throw new CheckError('Docker CLI unavailable. Ensure Docker Engine is running.', {
      check: 'docker-cli',
      data: omitUndefined({
        exitStatus: version.status,
        stderr: truncate(version.stderr),
      }),
      exitCode: 2,
    });
  }

  const serverVersion = version.stdout.trim();
  if (!serverVersion) {
    throw new CheckError('Docker CLI responded without a server version.', {
      check: 'docker-cli',
      exitCode: 2,
    });
  }

  return { serverVersion };
}

function inspectImage(image) {
  const inspect = spawnSync('docker', ['image', 'inspect', image], { encoding: 'utf8' });

  if (inspect.status !== 0) {
    throw new CheckError(`Docker image '${image}' not found. Run "pnpm docker:build" first.`, {
      check: 'image-inspect',
      data: omitUndefined({
        exitStatus: inspect.status,
        stderr: truncate(inspect.stderr),
      }),
      exitCode: 3,
    });
  }

  let metadata;
  try {
    const parsed = JSON.parse(inspect.stdout);
    metadata = Array.isArray(parsed) && parsed[0] ? parsed[0] : undefined;
  } catch (error) {
    throw new CheckError('Unable to parse docker inspect output.', {
      check: 'image-inspect',
      data: { parseError: error.message },
      exitCode: 3,
    });
  }

  if (!metadata) {
    throw new CheckError('Docker inspect returned empty metadata.', {
      check: 'image-inspect',
      exitCode: 3,
    });
  }

  return {
    id: metadata.Id,
    repoTags: metadata.RepoTags,
    createdAt: metadata.Created,
  };
}

function ensureStaticRootExists(image, staticRoot) {
  const escapedPath = staticRoot.replaceAll('"', '\\"');
  const check = spawnSync(
    'docker',
    ['run', '--rm', '--entrypoint', 'sh', image, '-c', `test -d "${escapedPath}"`],
    { encoding: 'utf8' },
  );

  if (check.status !== 0) {
    throw new CheckError(`Static root '${staticRoot}' not found in image '${image}'.`, {
      check: 'static-root',
      data: omitUndefined({
        staticRoot,
        exitStatus: check.status,
        stderr: truncate(check.stderr),
      }),
      exitCode: 7,
    });
  }

  return { staticRoot };
}

function readModulesManifest(image, modulesPath) {
  const result = spawnSync('docker', ['run', '--rm', '--entrypoint', 'cat', image, modulesPath], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new CheckError(`Unable to read ${modulesPath} from image '${image}'.`, {
      check: 'manifest-read',
      data: omitUndefined({
        exitStatus: result.status,
        stderr: truncate(result.stderr),
      }),
      exitCode: 4,
    });
  }

  const contents = result.stdout ?? '';
  const trimmed = contents.trim();
  if (!trimmed) {
    throw new CheckError('Modules manifest is empty. Build may have failed.', {
      check: 'manifest-read',
      data: { bytes: 0 },
      exitCode: 4,
    });
  }

  const bytes = Buffer.byteLength(contents, 'utf8');
  return { bytes, contents };
}

function analyzeManifest(contents) {
  const lines = contents.split(/\r?\n/);
  const packagePattern = /^\s{2}(?:\/)?(?:"([^"']+)"|'([^"']+)'|([^:\s]+)):\s*$/;
  const devFlagPattern = /^\s{4}dev:\s*true\b/;
  const packages = [];
  const devPackages = new Set();
  let currentPackage = null;

  for (const line of lines) {
    const packageMatch = line.match(packagePattern);
    if (packageMatch) {
      currentPackage = packageMatch[1] ?? packageMatch[2] ?? packageMatch[3] ?? null;
      if (currentPackage) {
        packages.push(currentPackage);
      }
      continue;
    }

    if (currentPackage === null) {
      packages.push(currentPackage);
      continue;
    }

    if (devFlagPattern.test(line)) {
      devPackages.add(currentPackage || '(unknown)');
    }
  }

  if (packages.length === 0) {
    throw new CheckError('Modules manifest contained no packages.', {
      check: 'manifest-analyze',
      exitCode: 5,
    });
  }

  return {
    totalPackages: packages.length,
    devPackages: [...devPackages].sort(),
  };
}

function omitUndefined(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

function truncate(value, max = 400) {
  if (typeof value !== 'string') {
    return value;
  }
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function finalize(report, startTime, { status, exitCode = 0, error }) {
  report.status = status;
  report.durationMs = Math.round(performance.now() - startTime);

  if (error) {
    report.error = omitUndefined({
      message: error.message,
      check: error.check,
      data: error.data,
    });
  }

  process.stdout.write(`${JSON.stringify(report)}\n`);

  if (status === 'pass' && process.stderr.isTTY) {
    process.stderr.write('✅  Runtime dependency check passed — production dependencies only.\n');
  }

  if (status === 'fail') {
    process.stderr.write(`✖  Runtime dependency check failed: ${error?.message ?? 'unknown error'}\n`);
  }

  process.exit(exitCode);
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    printUsage();
    process.exit(0);
  }

  const { image, modulesPath, staticRoot } = parsed;
  const startTime = performance.now();
  const report = {
    status: 'running',
    startedAt: new Date().toISOString(),
    image,
    modulesPath,
    envOverrides: omitUndefined({
      DOCKER_VERIFY_IMAGE: process.env.DOCKER_VERIFY_IMAGE,
      DOCKER_VERIFY_MODULES_PATH: process.env.DOCKER_VERIFY_MODULES_PATH,
      DOCKER_VERIFY_STATIC_ROOT: process.env.DOCKER_VERIFY_STATIC_ROOT,
    }),
    args: process.argv.slice(2),
    checks: [],
  };

  try {
    const dockerInfo = ensureDockerAvailable();
    report.checks.push({ name: 'docker-cli', status: 'pass', details: dockerInfo });

    const imageInfo = inspectImage(image);
    report.checks.push({ name: 'image-inspect', status: 'pass', details: imageInfo });

    const manifest = readModulesManifest(image, modulesPath);
    report.checks.push({
      name: 'manifest-read',
      status: 'pass',
      details: omitUndefined({ bytes: manifest.bytes }),
    });

    const analysis = analyzeManifest(manifest.contents);
    report.checks.push({
      name: 'manifest-analyze',
      status: 'pass',
      details: { totalPackages: analysis.totalPackages },
    });

    if (analysis.devPackages.length > 0) {
      throw new CheckError('Detected devDependencies in runtime node_modules.', {
        check: 'dev-dependencies',
        data: { devPackages: analysis.devPackages },
        exitCode: 6,
      });
    }

    report.checks.push({
      name: 'dev-dependencies',
      status: 'pass',
      details: { devPackages: 0 },
    });

    const staticRootCheck = ensureStaticRootExists(image, staticRoot);
    report.checks.push({ name: 'static-root', status: 'pass', details: staticRootCheck });

    finalize(report, startTime, { status: 'pass', exitCode: 0 });
  } catch (error) {
    if (error instanceof CheckError) {
      report.checks.push({
        name: error.check,
        status: 'fail',
        details: omitUndefined(error.data || {}),
      });
      finalize(report, startTime, { status: 'fail', exitCode: error.exitCode, error });
      return;
    }

    report.checks.push({ name: 'verification', status: 'fail', details: { unexpected: true } });
    finalize(report, startTime, {
      status: 'fail',
      exitCode: 1,
      error: new CheckError(error.message || 'Unknown error', { check: 'verification' }),
    });
  }
}

main();
