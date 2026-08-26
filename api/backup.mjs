#!/usr/bin/env node
/* Back the production database up, and prove the file is restorable.
 *
 * D1 has Time Travel, which covers "somebody ran a bad UPDATE" for the last
 * 30 days. It does not cover the account going away, and it is not something
 * you can read without Cloudflare. This writes a plain SQL file you own.
 *
 *   node backup.mjs                 -> backups/tenga-<date>.sql
 *   node backup.mjs --verify        -> also restores it into a scratch
 *                                      database and counts the rows back
 *
 * The --verify half is the point. An export nobody has restored is a belief,
 * not a backup.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, statSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, 'backups');
mkdirSync(dir, { recursive: true });

const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const out = join(dir, `tenga-${stamp}.sql`);
const wrangler = (...a) => execFileSync('npx', ['wrangler', ...a], { cwd: here, encoding: 'utf8', maxBuffer: 1 << 28 });

console.log('exporting the production database...');
wrangler('d1', 'export', 'tenga', '--remote', '--output', out);
const bytes = statSync(out).size;
const sql = readFileSync(out, 'utf8');

/* Counted from production, not by parsing the dump. The dump quotes its table
   names and batches its inserts, so counting INSERT statements undercounts and
   quietly reports a healthy backup as broken, which is the wrong way round for
   a check whose whole job is to be believed. */
const TABLES = ['orders', 'payments', 'messages', 'inbox', 'staff', 'audit'];
const liveCount = t => {
  const r = wrangler('d1', 'execute', 'tenga', '--remote', '--json', '--command',
                     `SELECT COUNT(*) n FROM ${t}`);
  return JSON.parse(r)[0].results[0].n;
};
const counts = {};
for (const t of TABLES) counts[t] = liveCount(t);
console.log(`wrote ${out}  (${Math.round(bytes / 1024)} KB)`);
console.log('rows in production:', JSON.stringify(counts));

if (!process.argv.includes('--verify')) {
  console.log('\nrun with --verify to prove the file actually restores.');
  process.exit(0);
}

/* Restore it somewhere disposable and count the rows back. If the numbers
   disagree, the export is not a backup however large the file is. */
console.log('\nrestoring into a scratch local database...');
const scratch = join(here, '.wrangler', 'backup-verify');
rmSync(scratch, { recursive: true, force: true });
try {
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'tenga', '--local', '--file', out, '-y',
                       '--persist-to', scratch],
               { cwd: here, encoding: 'utf8', stdio: 'pipe', maxBuffer: 1 << 28 });
  let ok = true;
  for (const [t, expected] of Object.entries(counts)) {
    const res = execFileSync('npx', ['wrangler', 'd1', 'execute', 'tenga', '--local', '--json',
                                     '--persist-to', scratch, '--command', `SELECT COUNT(*) n FROM ${t}`],
                             { cwd: here, encoding: 'utf8', stdio: 'pipe' });
    const got = JSON.parse(res)[0].results[0].n;
    const good = got === expected;
    if (!good) ok = false;
    console.log(`  ${good ? 'ok  ' : 'FAIL'} ${t}: ${got} restored, ${expected} in production`);
  }
  console.log(ok ? '\nRESTORE VERIFIED. This file is a backup.'
                 : '\nRESTORE MISMATCH. Do not rely on this file.');
  rmSync(scratch, { recursive: true, force: true });
  process.exit(ok ? 0 : 1);
} catch (e) {
  console.error('restore failed:', (e.stderr || e.message || '').toString().slice(0, 500));
  process.exit(1);
}
