#!/usr/bin/env node
/* The switch to the real domain, as one command, because doing it by hand is
   how canonicals end up pointing at the wrong host.
 *
 * Do NOT run this until tengauk.com resolves to GitHub Pages. Setting base to
 * "/" makes every internal link absolute from the root, which breaks the
 * github.io copy the moment it is deployed.
 *
 *   node golive.mjs          check readiness, change nothing
 *   node golive.mjs --apply  make the change
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const site = JSON.parse(readFileSync('site.json', 'utf8'));
const domain = site.domain;
const apply = process.argv.includes('--apply');

function dnsPointsAtPages() {
  try {
    const out = execSync(`dig +short ${domain} A`, { encoding: 'utf8' }).trim().split('\n');
    // GitHub Pages apex addresses
    const pages = ['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153'];
    return out.some(ip => pages.includes(ip.trim()));
  } catch { return false }
}

const ready = dnsPointsAtPages();
console.log(`domain            ${domain}`);
console.log(`DNS at GitHub     ${ready ? 'yes' : 'NO, not yet'}`);
console.log(`currently         url=${site.url}  base=${site.base}  indexable=${site.indexable}`);

if (!apply) {
  console.log(`\nNothing changed. When DNS is ready, run:  node golive.mjs --apply`);
  console.log(`At the registrar, point ${domain} at GitHub Pages:`);
  console.log(`  A     @    185.199.108.153, .109.153, .110.153, .111.153`);
  console.log(`  CNAME www  winstondube.github.io`);
  process.exit(0);
}
if (!ready) {
  console.error(`\nRefusing: ${domain} does not resolve to GitHub Pages yet.`);
  console.error(`Switching now would take the site offline. Set the DNS first.`);
  process.exit(1);
}

site.url = `https://${domain}`;
site.base = '/';
site.indexable = true;
writeFileSync('site.json', JSON.stringify(site, null, 2) + '\n');
writeFileSync('CNAME', domain + '\n');
execSync('node build.mjs', { stdio: 'inherit' });
console.log(`\nDone. Committed nothing: check the build, then commit and push.`);
console.log(`Afterwards, submit https://${domain}/sitemap.xml to Google Search Console.`);
