// Builds the site into dist/. Every page is self-contained: CSS, the icon sprite, the diagram,
// the data and the scripts are inlined, so each page opens from a file or from one upload.
//
//   dist/index.html, dist/generate.html, dist/database.html   the site (what Netlify serves)
//   dist-artifact/index.html   home page as a fragment, for publishing to the Artifact host.
//       That host wraps the entry page itself, so the fragment has no doctype, html, head or
//       body tags. It lives outside dist/ so the site never serves it.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const ARTIFACT = join(ROOT, 'dist-artifact');
const PAGES = ['index', 'generate', 'database'];

const read = p => readFileSync(join(ROOT, p), 'utf8');
// keep inlined code from closing its own <script> or <style> element
const safeScript = s => s.replace(/<\/(script|style)/gi, (m, t) => '<\\/' + t);

function inlineCss(list) {
  const css = list.split(',').map(n => read(`src/css/${n.trim()}.css`)).join('\n');
  return '<style>\n' + css + '\n</style>';
}

function inlineJs(list) {
  return list.split(',').map(p => '<script>\n' + safeScript(read(p.trim())) + '\n</script>').join('\n');
}

// Function replacements, so a stray "$" in inlined code is never read as a replacement pattern.
function page(name) {
  let html = read(`src/html/${name}.html`);
  html = html.replace(/<!--CSS:([\w,]+)-->/g, (_, l) => inlineCss(l));
  html = html.replace(/<!--JS:([^>]+?)-->/g, (_, l) => inlineJs(l));
  html = html.replace('<!--SPRITE-->', () => read('src/svg/sprite.svg'));
  html = html.replace('<!--DIAGRAM-->', () => read('src/svg/diagram.svg'));
  html = html.replace('<!--DATA-->', () => safeScript(read('data/parts.json').trim()));
  if (/<!--[A-Z]+[:\-]/.test(html)) throw new Error('unfilled placeholder in ' + name);
  return html;
}

// The artifact host supplies doctype, html, head and body and the charset and viewport metas.
function fragment(html) {
  return html
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<\/?html[^>]*>\s*/gi, '')
    .replace(/<\/?head>\s*/gi, '')
    .replace(/<\/?body[^>]*>\s*/gi, '')
    .replace(/<meta charset[^>]*>\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '');
}

rmSync(DIST, { recursive: true, force: true });
rmSync(ARTIFACT, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
mkdirSync(ARTIFACT, { recursive: true });

const report = [];
for (const name of PAGES) {
  const html = page(name);
  writeFileSync(join(DIST, name + '.html'), html);
  report.push(['dist/' + name + '.html', html.length]);
}
const home = fragment(page('index'));
writeFileSync(join(ARTIFACT, 'index.html'), home);
report.push(['dist-artifact/index.html', home.length]);

for (const [file, bytes] of report) {
  console.log(file.padEnd(28), (bytes / 1024).toFixed(0).padStart(6) + ' KB');
}
console.log('site: dist/   artifact fragment: dist-artifact/');
