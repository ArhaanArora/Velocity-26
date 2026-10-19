import { build } from 'vite';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Vite already handles the engine's extensionless TS imports and type-only
// symbols. Bundle test entries in a temporary folder; never rewrite engine code.
const folder = await mkdtemp(path.join(tmpdir(), 'cyberlab-checks-'));
try {
  const result = await build({
    configFile: false,
    logLevel: 'error',
    build: {
      ssr: true, write: false, minify: false,
      rolldownOptions: { input: ['src/engine/testRunner.ts', 'src/adapters/engineAdapter.test.ts', 'src/mocks/mockEngine.test.mjs', 'src/lib/learning.test.mjs'] },
    },
  });
  const entries = [];
  for (const output of result.output) {
    const target = path.join(folder, output.fileName);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, output.type === 'chunk' ? output.code : output.source);
    if (output.type === 'chunk' && output.isEntry) entries.push(target);
  }
  await writeFile(path.join(folder, 'package.json'), '{"type":"module"}');
  const checks = spawnSync(process.execPath, ['--test', ...entries], { encoding: 'utf8' });
  process.stdout.write(checks.stdout ?? '');
  process.stderr.write(checks.stderr ?? '');
  if (checks.error) throw checks.error;
  // The legacy engine runner prints its result instead of setting an exit code.
  process.exitCode = checks.status !== 0 || /SOME TESTS FAILED|Accounting: FAILED/.test(checks.stdout ?? '') ? 1 : 0;
} finally {
  const resolved = path.resolve(folder);
  if (path.dirname(resolved) !== path.resolve(tmpdir()) || !path.basename(resolved).startsWith('cyberlab-checks-')) throw new Error('Unexpected test output path');
  await rm(resolved, { recursive: true, force: true });
}
