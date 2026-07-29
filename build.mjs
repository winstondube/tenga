#!/usr/bin/env node
/**
 * Build.
 *
 * Produces a static site that a crawler can read without running JavaScript,
 * from a single source of truth (src/app.html).
 *
 *   index.html                the app, with the landing page PRE-RENDERED into
 *                             it so view-source shows real content
 *   shop/<retailer>/          one page per approved retailer
 *   collection/               collect in Harare
 *   what-it-costs/            pricing, with live worked examples
 *   what-we-cannot-send/      restricted goods
 *   how-it-works/
 *   robots.txt, sitemap.xml
 *
 * Every URL, canonical and internal link is derived from site.json. Moving to
 * the real domain is a two-field edit, not a find-and-replace.
 *
 * Run: node build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildPages } from './src/pages.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const site = JSON.parse(readFileSync(join(root, 'site.json'), 'utf8'));
const SRC = readFileSync(join(root, 'src/app.html'), 'utf8');

const ORIGIN = site.url.replace(/\/+$/, '');
const BASE = site.base.endsWith('/') ? site.base : site.base + '/';
const abs = p => ORIGIN + BASE + String(p).replace(/^\//, '');

/* ---------- pull the app's own data and helpers into the build ---------- */
const APP_JS = SRC.split('<script>')[1].split('</script>')[0];
const APP_CSS = SRC.split('<style>')[1].split('</style>')[0];

globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null }, setItem(k, v) { this._d[k] = v }, removeItem(k) { delete this._d[k] } };
let RENDERED = '';
globalThis.document = {
  addEventListener() {},
  querySelector(s) { return s === '#app' ? { set innerHTML(v) { RENDERED = v }, get innerHTML() { return RENDERED } } : null },
  getElementById() { return null }, querySelectorAll() { return [] },
  createElement() { return { style: {}, classList: { add() {} }, appendChild() {}, remove() {} } },
  body: { appendChild() {} }
};
globalThis.window = { addEventListener() {}, scrollY: 0, scrollTo() {}, matchMedia: () => ({ matches: false }) };
globalThis.location = { hash: '#/', origin: ORIGIN, pathname: BASE };

const api = eval(APP_JS + `
;({ S, settings: S.settings, retailers: S.retailers, restricted: S.restricted,
    viewHome, shell, quoteCalc, money, retailerById, newItem, note, icon, esc,
    HOME_FAQ, shipSchedule, nextShipment, fmtDay })`);

/* ---------- shared chrome for the static marketing pages ---------- */
const NAV = [
  ['How it works', 'how-it-works/'],
  ['What it costs', 'what-it-costs/'],
  ['Shops', 'shop/'],
  ['Collection', 'collection/'],
  ['What we cannot send', 'what-we-cannot-send/']
];

const FAVICON = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
  '<rect width="24" height="24" rx="4" fill="#0B5D4E"/>' +
  '<path d="M11 4.5a1.3 1.3 0 0 1 2.6 0l.2 5.2 6.4 3.6v2l-6.4-2-.3 3.6 2.2 1.6v1.3L12 19l-3.8.9v-1.3l2.2-1.6-.3-3.6-6.4 2v-2L10 9.7z" fill="none" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg>');

const RESET = `*,*::before,*::after{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100dvh}img,svg,video{display:block;max-width:100%}
button,input,select,textarea{font-family:inherit;font-size:100%}`;

const PAGE_CSS = `
.site-head{border-bottom:1px solid var(--line);background:var(--surface)}
.site-head-in{max-width:1180px;margin:0 auto;padding:12px 24px;display:flex;align-items:center;gap:22px;flex-wrap:wrap}
.site-head a.brand{text-decoration:none}
.site-nav{display:flex;gap:18px;flex-wrap:wrap;margin-left:auto}
.site-nav a{font-size:13.5px;color:var(--ink-2);text-decoration:none}
.site-nav a:hover{color:var(--ink);text-decoration:underline}
.page{max-width:820px;margin:0 auto;padding:clamp(28px,4vw,52px) 24px 72px}
.page h1{font-family:var(--serif);font-weight:400;font-size:clamp(2rem,4.6vw,3.1rem);line-height:1.08;letter-spacing:-.02em;margin-bottom:14px}
.page h2{font-size:clamp(19px,2.2vw,23px);margin:38px 0 12px;letter-spacing:-.01em}
.page p{margin:0 0 14px;line-height:1.65;max-width:68ch;text-wrap:pretty}
.page .lede{font-size:clamp(16px,1.8vw,18.5px);color:var(--ink-2);max-width:60ch;margin-bottom:26px}
.page ul{line-height:1.65;padding-left:20px;max-width:68ch}
.page .card,.page .steps,.page table.t{margin:16px 0}
.page table.t{background:var(--surface);border:1px solid var(--line);border-radius:var(--r)}
.page table.t th,.page table.t td{padding:10px 13px}
.crumbs{font-size:12.5px;color:var(--ink-3);margin-bottom:18px}
.crumbs a{color:var(--ink-3)}
.faq{margin-top:44px;border-top:1px solid var(--line);padding-top:8px}
.faq details{border-bottom:1px solid var(--line);padding:2px 0}
.faq summary{padding:14px 2px;cursor:pointer;font-weight:600;font-size:15.5px;list-style:none;display:flex;justify-content:space-between;gap:16px;align-items:center}
.faq summary::after{content:"+";font-family:var(--mono);color:var(--ink-3);font-weight:400}
.faq details[open] summary::after{content:"–"}
.faq details[open] summary{border:0}
.faq .a{padding:0 2px 16px;color:var(--ink-2);line-height:1.65;max-width:68ch}
.site-foot{border-top:1px solid var(--line);background:var(--surface);margin-top:auto}
.site-foot-in{max-width:1180px;margin:0 auto;padding:30px 24px 40px;display:grid;gap:22px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));font-size:13.5px}
.site-foot h3{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);margin-bottom:10px;font-weight:600}
.site-foot a{display:block;color:var(--ink-2);text-decoration:none;padding:3px 0}
.site-foot a:hover{text-decoration:underline}
.site-legal{max-width:1180px;margin:0 auto;padding:0 24px 34px;font-size:12.5px;color:var(--ink-3)}
body{display:flex;flex-direction:column}
`;

function head({ title, description, canonical, jsonld }) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${api.esc(title)}</title>
<meta name="description" content="${api.esc(description)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="${site.indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'}">
<meta name="theme-color" content="#F0F3F0" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0C1211" media="(prefers-color-scheme: dark)">
<meta property="og:site_name" content="${api.esc(site.name)}">
<meta property="og:title" content="${api.esc(title)}">
<meta property="og:description" content="${api.esc(description)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="${site.locale}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${FAVICON}">
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
<style>${RESET}${APP_CSS}${PAGE_CSS}</style>`;
}

const orgLd = {
  '@context': 'https://schema.org', '@type': 'Organization',
  name: site.name, url: abs(''), description: site.tagline,
  email: site.contactEmail, areaServed: ['ZW', 'GB'],
  logo: abs('') // the mark is inline SVG; a raster logo goes here when there is one
};

function faqLd(faq) {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
  };
}
function crumbLd(crumbs) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [['Home', '']].concat(crumbs).map(([name, p], i) => ({
      '@type': 'ListItem', position: i + 1, name, item: abs(p)
    }))
  };
}

function chrome(inner, { skipNav } = {}) {
  return `<header class="site-head"><div class="site-head-in">
  <a class="brand" href="${BASE}"><span class="mark">${api.icon('plane', 14)}</span><span>tenga<span class="tld">.uk</span></span></a>
  <nav class="site-nav">${NAV.map(([l, p]) => `<a href="${BASE}${p}">${l}</a>`).join('')}</nav>
</div></header>
${inner}
<footer class="site-foot"><div class="site-foot-in">
  <div><h3>Service</h3>${NAV.map(([l, p]) => `<a href="${BASE}${p}">${l}</a>`).join('')}</div>
  <div><h3>Shops</h3>${api.retailers.slice(0, 6).map(r => `<a href="${BASE}shop/${r.id}/">${api.esc(r.name)}</a>`).join('')}<a href="${BASE}shop/">All shops</a></div>
  <div><h3>Collection</h3>${`<a href="${BASE}collection/">Collect in Harare</a>`}</div>
  <div><h3>Start</h3><a href="${BASE}#/request">Send a link</a><a href="${BASE}#/lookup">Track an order</a><a href="mailto:${site.contactEmail}">${site.contactEmail}</a></div>
</div>
<div class="site-legal">
  ${site.name}, a buy-for-me and forwarding service. Cargo handled by third party carriers.
  Website designed &amp; built by <a href="https://welaunchsites.com/" style="display:inline;color:var(--ink-2)">LaunchSite</a>.
</div></footer>`;
}

/* ---------- write ---------- */
const written = [];
function write(path, html) {
  const dir = path === '' ? root : join(root, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html.replace(/\{\{BASE\}\}/g, BASE));
  written.push(path);
}

/* faqLd and crumbLd are function declarations, so they hoist. */

/* 1. the app, with the landing page pre-rendered so it is crawlable */

const homeInner = api.shell(api.viewHome(), false);
const homeLd = [orgLd, faqLd(api.HOME_FAQ()), {
  '@context': 'https://schema.org', '@type': 'Service',
  name: 'UK buy-for-me and Zimbabwe forwarding', provider: { '@type': 'Organization', name: site.name },
  areaServed: { '@type': 'Country', name: 'Zimbabwe' },
  description: 'Send a link to a product in a UK shop. We buy it, check it and ship it to Zimbabwe for one agreed price including shipping.',
  offers: {
    '@type': 'Offer', priceCurrency: 'GBP',
    description: `${api.settings.procurementPct}% procurement fee, minimum ${api.money(api.settings.procurementMin)}, on a minimum order of ${api.money(api.settings.minSpend)}`
  }
}];
writeFileSync(join(root, 'index.html'), `<!doctype html>
<html lang="en-GB">
<head>
${head({
  title: `${site.name} · ${site.tagline}`,
  description: 'Paste a link from a UK shop. We buy it, check it by hand and fly it to Zimbabwe. One price including shipping, agreed before you pay.',
  canonical: abs(''), jsonld: homeLd
})}
<style>
#themeSwitch{position:fixed;left:14px;bottom:14px;z-index:150;width:34px;height:34px;display:grid;place-items:center;
 border-radius:50%;cursor:pointer;background:var(--surface);border:1px solid var(--line);color:var(--ink-2);box-shadow:0 2px 10px rgba(0,0,0,.10)}
#themeSwitch:hover{background:var(--surface-2)}
@media (max-width:600px){#themeSwitch{width:30px;height:30px;left:10px;bottom:10px}}
</style>
</head>
<body>
${SRC.split('<div id="app"></div>')[0].replace(/<title>[\s\S]*?<\/title>/, '').replace(/<style>[\s\S]*?<\/style>/, '')}
<div id="app">${homeInner}</div>
${SRC.split('<div id="app"></div>')[1]}
<footer class="site-foot"><div class="site-foot-in">
  <div><h3>Service</h3>${NAV.map(([l, p]) => `<a href="${BASE}${p}">${l}</a>`).join('')}</div>
  <div><h3>Shops</h3>${api.retailers.slice(0, 6).map(r => `<a href="${BASE}shop/${r.id}/">${api.esc(r.name)}</a>`).join('')}<a href="${BASE}shop/">All shops</a></div>
  <div><h3>Collection</h3>${`<a href="${BASE}collection/">Collect in Harare</a>`}</div>
  <div><h3>Start</h3><a href="${BASE}#/request">Send a link</a><a href="${BASE}#/lookup">Track an order</a></div>
</div></footer>
<button id="themeSwitch" type="button" aria-label="Switch between light and dark">
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/></svg>
</button>
<script>
(function(){var K='tenga_theme',r=document.documentElement,b=document.getElementById('themeSwitch');
var v=null;try{v=localStorage.getItem(K)}catch(e){}
if(v)r.setAttribute('data-theme',v);
b.addEventListener('click',function(){var d=window.matchMedia('(prefers-color-scheme: dark)').matches;
var n=r.getAttribute('data-theme')||(d?'dark':'light');var x=n==='dark'?'light':'dark';
r.setAttribute('data-theme',x);try{localStorage.setItem(K,x)}catch(e){}});})();
</script>
</body>
</html>
`);

/* 2. the marketing pages */
const pages = buildPages(api);
pages.forEach(p => {
  const canonical = abs(p.path);
  const ld = [crumbLd(p.crumbs)];
  if (p.faq && p.faq.length) ld.push(faqLd(p.faq));
  const html = `<!doctype html>
<html lang="en-GB">
<head>
${head({ title: `${p.title} | ${site.name}`, description: p.description, canonical, jsonld: ld })}
</head>
<body>
${chrome(`<main class="page">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${BASE}">Home</a>${p.crumbs.map(([n, path]) => ` › <a href="${BASE}${path}">${api.esc(n)}</a>`).join('')}</nav>
  <h1>${api.esc(p.h1)}</h1>
  <p class="lede">${api.esc(p.lede)}</p>
  ${p.body}
  ${p.faq && p.faq.length ? `<section class="faq"><h2 style="margin-top:8px">Questions</h2>
    ${p.faq.map(([q, a]) => `<details><summary>${api.esc(q)}</summary><div class="a">${api.esc(a)}</div></details>`).join('')}
  </section>` : ''}
</main>`)}
</body>
</html>
`;
  write(p.path, html);
});

/* 3. crawler files */
const urls = [''].concat(pages.map(p => p.path));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${abs(u)}</loc><changefreq>${u === '' ? 'weekly' : 'monthly'}</changefreq><priority>${u === '' ? '1.0' : '0.7'}</priority></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(root, 'sitemap.xml'), sitemap);

writeFileSync(join(root, 'robots.txt'), site.indexable
  ? `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}${BASE}sitemap.xml\n`
  : `# Prototype. Indexing is disabled until site.json sets "indexable": true.\nUser-agent: *\nDisallow: /\n`);

/* 4. report */
const kb = n => (n / 1024).toFixed(1) + ' KB';
console.log(`built  index.html            ${kb(readFileSync(join(root, 'index.html')).length)}  (landing page pre-rendered)`);
console.log(`built  ${written.length} marketing pages`);
written.forEach(p => console.log(`         ${BASE}${p}`));
console.log(`built  sitemap.xml           ${urls.length} urls`);
console.log(`built  robots.txt            ${site.indexable ? 'indexable' : 'DISALLOW ALL (prototype)'}`);
console.log('');
if (!site.indexable) console.log('NOTE  site.json "indexable" is false, so nothing will be indexed. Flip it at launch.');
if (ORIGIN.includes('github.io')) console.log(`NOTE  site.json "url" is still ${ORIGIN}. Set the real domain before launch or every canonical points at GitHub.`);
