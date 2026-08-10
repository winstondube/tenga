#!/usr/bin/env node
/**
 * Runs every test against the CURRENT src/app.html.
 *
 * The tests eval the app's own <script> block against a stubbed DOM, so they
 * exercise the real pricing, the real status machine and the real render
 * functions rather than a copy of them. That is the only reason they keep
 * catching things: there is nothing to drift out of sync with.
 *
 * Run: node tests/all.mjs            (from the repo root)
 *      node tests/all.mjs refund     (only tests whose name contains "refund")
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// Extract the app's script once, so every test sees the same build.
const src = readFileSync(join(root, 'src/app.html'), 'utf8');
writeFileSync(join(here, 'check.js'), src.split('<script>')[1].split('</script>')[0]);

// The build silently failing is worse than a test failing, because the site
// keeps serving stale pages that still pass every test.
try {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
} catch (e) {
  console.log('\x1b[31mBUILD FAILED\x1b[0m');
  process.stdout.write((e.stdout || '') + (e.stderr || ''));
  process.exit(1);
}

const filter = process.argv[2] || '';
const files = readdirSync(here)
  .filter(f => f.endsWith('.js') && !['harness.js', 'check.js'].includes(f))
  .filter(f => f.includes(filter))
  .sort();

let failed = 0;
for (const f of files) {
  process.stdout.write(`\n\x1b[1m── ${f}\x1b[0m\n`);
  try {
    const out = execFileSync(process.execPath, [f], { cwd: here, encoding: 'utf8' });
    process.stdout.write(out);
    // A test fails loudly if it prints one of these, so the runner honours that.
    if (/\bfailures:\s*[1-9]|\bBUG\b|NO, |STILL WRONG/.test(out)) { failed++; console.log('\x1b[31m   ^ FAILED\x1b[0m') }
  } catch (e) {
    failed++;
    process.stdout.write((e.stdout || '') + (e.stderr || ''));
    console.log('\x1b[31m   ^ THREW\x1b[0m');
  }
}

console.log(`\n${files.length} test files, ${failed} with failures`);
process.exit(failed ? 1 : 0);
