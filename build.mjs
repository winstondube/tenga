#!/usr/bin/env node
/**
 * Wraps src/app.html (an artifact-shaped fragment) into a complete, standalone
 * HTML document at index.html, which is what GitHub Pages serves.
 *
 * One source, two homes:
 *   src/app.html -> Claude artifact (the runtime supplies <head> and the reset)
 *   src/app.html -> index.html      (this script supplies them instead)
 *
 * Run: node build.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(root, 'src/app.html'), 'utf8');

const TITLE = 'Tenga UK · Buy-for-me and Zimbabwe forwarding';
const DESC = 'Paste a UK product link. We buy it, check it, and forward it to Zimbabwe. Prototype build.';

// Inline favicon so the page stays fully self-contained.
const FAVICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
      '<rect width="24" height="24" rx="4" fill="#0B5D4E"/>' +
      '<path d="M11 4.5a1.3 1.3 0 0 1 2.6 0l.2 5.2 6.4 3.6v2l-6.4-2-.3 3.6 2.2 1.6v1.3L12 19l-3.8.9v-1.3l2.2-1.6-.3-3.6-6.4 2v-2L10 9.7z" fill="none" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/>' +
      '</svg>'
  );

const out = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="${DESC}">
<meta name="theme-color" content="#F4F3EE" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E1213" media="(prefers-color-scheme: dark)">
<meta name="robots" content="noindex, nofollow">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESC}">
<meta property="og:type" content="website">
<link rel="icon" href="${FAVICON}">
<style>
/* Minimal reset. The artifact runtime provides this; standalone needs its own. */
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100dvh}
img,svg,video{display:block;max-width:100%}
button,input,select,textarea{font-family:inherit;font-size:100%}
/* Standalone-only: theme switch, since there is no host toolbar to provide one. */
#themeSwitch{position:fixed;left:14px;bottom:14px;z-index:150;width:34px;height:34px;display:grid;
 place-items:center;border-radius:50%;cursor:pointer;background:var(--surface,#fff);
 border:1px solid var(--line,#DCDAD1);color:var(--ink-2,#3E4845);box-shadow:0 2px 10px rgba(0,0,0,.10)}
#themeSwitch:hover{background:var(--surface-2,#EDECE6)}
@media (max-width:600px){#themeSwitch{width:30px;height:30px;left:10px;bottom:10px}}
</style>
</head>
<body>
${src}
<button id="themeSwitch" type="button" aria-label="Switch between light and dark">
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/>
  </svg>
</button>
<script>
(function(){
  var K='tenga_theme', r=document.documentElement, b=document.getElementById('themeSwitch');
  var saved=null; try{saved=localStorage.getItem(K)}catch(e){}
  if(saved) r.setAttribute('data-theme',saved);
  b.addEventListener('click',function(){
    var sysDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
    var now=r.getAttribute('data-theme')||(sysDark?'dark':'light');
    var next=now==='dark'?'light':'dark';
    r.setAttribute('data-theme',next);
    try{localStorage.setItem(K,next)}catch(e){}
  });
})();
</script>
</body>
</html>
`;

writeFileSync(join(root, 'index.html'), out);
console.log('built index.html  ' + (out.length / 1024).toFixed(1) + ' KB');
