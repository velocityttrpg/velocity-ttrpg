#!/usr/bin/env node
/**
 * Velocity TTRPG — Website Builder
 * ==================================
 * Converts all markdown source files into reader HTML pages and generates
 * search-index.json.
 *
 * Usage (run from the Website/ directory):
 *   node build.js
 *
 * BEFORE DEPLOYING: Update GITHUB_REPO below so the "Report Issue" buttons
 * link to your actual repository.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────────────

const GITHUB_REPO  = 'velocityttrpg/velocity-ttrpg';  // confirm this matches your actual org/repo
const SITE_URL     = 'https://velocityttrpg.github.io/velocity-ttrpg';  // no trailing slash

const SCRIPT_DIR   = __dirname;
const PROJECT_ROOT = path.dirname(SCRIPT_DIR);

const BOOKS = [
  {
    id:         'core',
    name:       'Core Rules',
    slug:       'core-rules',
    color:      '#6fb7ff',
    source:     path.join(PROJECT_ROOT, 'Core Rules'),
    navExclude: new Set(),
  },
  {
    id:         'glossary',
    name:       'Glossary',
    slug:       'glossary',
    color:      '#ffd76f',
    source:     path.join(PROJECT_ROOT, 'Glossary'),
    navExclude: new Set(),
  },
  {
    id:           'starter-kit',
    name:         'Starter Kit',
    slug:         'starter-kit',
    color:        '#c47fff',
    source:       path.join(PROJECT_ROOT, 'Starter Kit'),
    navExclude:   new Set(['Starter Kit Review']),
    chapterOrder: [
      'Introduction',
      "Narrator's Guide/Overview",
      "Narrator's Guide/Dunmore and Dardan",
      "Narrator's Guide/Narrator Quick Reference",
      "Narrator's Guide/The Truthstone",
      "Narrator's Guide/Act 1 - The Tribunal",
      "Narrator's Guide/Act 2 - The Investigation",
      "Narrator's Guide/Act 3 - The Confrontation",
    ],
  },
  {
    // Site-level pages (About, Playtesting) — content we actually iterate on,
    // unlike the static legal.html (OGL text we'll never revise). Rendered at
    // the Website root instead of under reader/<slug>/ so existing links like
    // "about.html" keep working. See outputAtRoot handling below.
    id:           'site',
    name:         'Site Pages',
    slug:         'site',
    color:        '#ffd76f',
    source:       path.join(SCRIPT_DIR, 'Site'),
    navExclude:   new Set(),
    outputAtRoot: true,
  },
];

const SKIP_DIRS = new Set(['_archive']);

// ─── Utilities ────────────────────────────────────────────────────────────────

function slugify(name) {
  return name.toLowerCase()
    .replace(/['‘’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function fileSlug(mdPath, sourceRoot) {
  const rel   = path.relative(sourceRoot, mdPath);
  const parts = rel.split(path.sep);
  parts[parts.length - 1] = parts[parts.length - 1].replace(/\.md$/i, '');
  return parts.map(slugify).join('-');
}

// Safely percent-decode a path segment (e.g. "Opposition%20Checks" -> "Opposition Checks").
// Markdown links are sometimes URL-encoded and sometimes not; decoding before slugifying
// means both forms produce the same key instead of digits from "%20" leaking into the slug.
function decodeRefSegment(seg) {
  try { return decodeURIComponent(seg); } catch { return seg; }
}

// Normalize a cross-reference path (as written in markdown — possibly relative, possibly
// URL-encoded, possibly using "/" or "\\") into a stable, comparable key: lowercase,
// slugified per path segment, joined with "/". "." and ".." segments are dropped since
// the key represents structural identity, not a literal filesystem traversal.
function normalizeRefPath(p) {
  return p
    .replace(/\.md$/i, '')
    .split(/[\/\\]/)
    .filter(seg => seg && seg !== '.' && seg !== '..')
    .map(seg => slugify(decodeRefSegment(seg)))
    .filter(Boolean)
    .join('/');
}

function depthPrefix(url) {
  const count = (url.match(/\//g) || []).length;
  return '../'.repeat(count);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** JSON-encode a string and HTML-escape the quotes for inline onclick use. */
function jsAttr(str) {
  return JSON.stringify(str).replace(/"/g, '&quot;');
}

// ─── Inline Markdown ──────────────────────────────────────────────────────────

function plainText(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g,     '$1')
    .replace(/`(.+?)`/g,       '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim();
}

// Set before each book's pages are rendered; used by resolveDocRef for cross-reference
// resolution (both markdown links in inlineMd and <code>File.md</code> spans in linkifyMdRefs).
let _currentFileMap   = null;  // current book: basename-slug -> chapter url (root-relative)
let _currentBook      = null;  // the book object currently being rendered
let _currentPageUrl   = null;  // root-relative url of the page currently being rendered
let _fullPathIndex    = null;  // vault-relative normalized path -> { book, ch }
let _localPathIndex   = null;  // Map<book, Map<book-relative normalized path, chapter url>>
let _globalFileMap    = null;  // basename-slug -> chapter url (any book, first wins)

// Resolve a cross-reference (the path inside a markdown link or a `File.md` code-span) to
// an href relative to the page being rendered. Tries, in order:
//   1. An exact, book-qualified path (e.g. "Player's Guide/Introduction.md") — unambiguous
//      even when another book has a same-named chapter.
//   2. A path relative to the current book (e.g. "Encounters/Conditions.md" written from
//      elsewhere in Core Rules, with the book name omitted).
//   3. A bare basename (e.g. "Conditions.md") — legacy fallback, current book first, then
//      any book.
// Every match is stored as a root-relative url (e.g. "reader/core-rules/x.html" or
// "about.html"), so resolution always goes through depthPrefix(_currentPageUrl) + that url —
// "go back to the site root, then down to the target." This works regardless of how deep the
// current page or the target page sit, including the outputAtRoot books that live directly at
// the Website root rather than under reader/<slug>/. It produces slightly longer relative
// paths for same-directory links than a directory-aware shortcut would, but it can't be broken
// by a book's output location the way that shortcut was.
// Returns null if nothing matches.
function resolveDocRef(ref) {
  const norm = normalizeRefPath(ref);
  const base = norm.split('/').pop();
  const toRoot = depthPrefix(_currentPageUrl || '');

  if (_fullPathIndex && _fullPathIndex.has(norm)) {
    return toRoot + _fullPathIndex.get(norm).ch.url;
  }

  const localMap = _localPathIndex && _localPathIndex.get(_currentBook);
  if (localMap && localMap.has(norm)) {
    return toRoot + localMap.get(norm);
  }

  if (_currentFileMap && _currentFileMap[base]) return toRoot + _currentFileMap[base];
  if (_globalFileMap && _globalFileMap[base]) return toRoot + _globalFileMap[base];

  return null;
}

function inlineMd(text) {
  let t = escHtml(text);
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*(.+?)\*/g,     '<em>$1</em>');
  t = t.replace(/`([^`]+?)`/g,    '<code>$1</code>');
  // Internal .md links — resolve via the shared cross-reference resolver when possible.
  // Captures an optional #fragment after .md and appends it to the resolved href.
  t = t.replace(/\[(.+?)\]\((.+?)\.md(#[^)]+)?\)/g, (_, label, href, frag) => {
    const resolved = resolveDocRef(href);
    const base = resolved ? resolved : `${href}.html`;
    return `<a href="${base}${frag || ''}">${label}</a>`;
  });
  // All other links
  t = t.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  return t;
}

// ─── Block Parser ─────────────────────────────────────────────────────────────

function splitBlocks(text) {
  const isListLine = l => /^\s*([-*]|\d+\.)\s/.test(l);

  const blocks      = [];
  let current       = [];
  let inCode        = false;
  let pendingBlanks = [];   // blank lines buffered between potential list items

  for (const line of text.split('\n')) {
    // Code fence toggle
    if (line.trim().startsWith('```')) {
      inCode = !inCode;
      current.push(...pendingBlanks, line);
      pendingBlanks = [];
      if (!inCode && current.length) {
        blocks.push(current.join('\n'));
        current = [];
      }
      continue;
    }

    // Buffer blank lines — don't decide to split yet
    if (!inCode && line.trim() === '') {
      pendingBlanks.push(line);
      continue;
    }

    // Non-blank line: decide what to do with the buffered blanks
    if (pendingBlanks.length > 0) {
      const lastLine = current[current.length - 1] || '';
      if (isListLine(lastLine) && isListLine(line)) {
        // Both sides are list items — keep them in the same block
        // so the <ol> doesn't restart at 1
        current.push(...pendingBlanks);
      } else {
        // Different block types — split here
        if (current.length) {
          blocks.push(current.join('\n'));
          current = [];
        }
      }
      pendingBlanks = [];
    }

    current.push(line);
  }

  if (current.length) blocks.push(current.join('\n'));
  return blocks.filter(b => b.trim());
}

function classifyBlock(block) {
  const first = block.trim().split('\n')[0];
  if (first.startsWith('#'))          return 'heading';
  if (first.startsWith('```'))        return 'code';
  if (first.startsWith('|'))          return 'table';
  if (/^[-*]\s/.test(first))         return 'ul';
  if (/^\d+\.\s/.test(first))        return 'ol';
  if (first.startsWith('>'))         return 'blockquote';
  if (/^[-*_]{3,}\s*$/.test(first)) return 'hr';
  return 'paragraph';
}

// ─── Block Renderers ──────────────────────────────────────────────────────────

function renderHeading(block) {
  const m = block.trim().match(/^(#{1,6})\s+(.+)/);
  if (!m) return { html: '', text: '', level: 0 };
  const level  = m[1].length;
  const raw    = m[2];
  const text   = plainText(raw);
  const anchor = slugify(text);
  return { html: `<h${level} id="${anchor}">${inlineMd(raw)}</h${level}>`, text, level };
}

function renderCode(block) {
  const lines = block.trim().split('\n');
  const lang  = lines[0].replace(/```/g, '').trim();
  let body    = lines.slice(1).join('\n');
  if (body.endsWith('```')) body = body.slice(0, -3);
  return `<pre><code class="language-${escHtml(lang)}">${escHtml(body)}</code></pre>`;
}

function renderTable(block) {
  const rows = block.trim().split('\n').filter(r => r.trim());
  if (rows.length < 2) return `<p>${inlineMd(block)}</p>`;

  const parseCells = row => row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  const header     = parseCells(rows[0]);
  const bodyRows   = rows.slice(2).map(parseCells);  // skip separator row

  const thead = '<thead><tr>' +
    header.map(h => `<th>${inlineMd(h)}</th>`).join('') +
    '</tr></thead>';
  const tbody = '<tbody>' +
    bodyRows.map(r =>
      '<tr>' + r.map(c => `<td>${inlineMd(c)}</td>`).join('') + '</tr>'
    ).join('') +
    '</tbody>';

  return `<table>${thead}${tbody}</table>`;
}

function renderListBlock(block, _isOl, paraId, bookName, chapterName) {
  const itemRe = /^(\s*)([-*]|\d+\.)\s+(.*)/;
  const items  = block.split('\n')
    .filter(l => l.trim())
    .map(l => {
      const m = l.match(itemRe);
      return m ? { indent: m[1].length, ordered: /\d/.test(m[2]), content: m[3] } : null;
    })
    .filter(Boolean);

  if (!items.length) return '';

  let liSeq = 0;

  function liBtn(id) {
    if (!paraId) return '';
    return `<button class="li-report-btn" title="Report issue with this item" ` +
      `onclick="event.stopPropagation();openReportModal(${jsAttr(id)},${jsAttr(bookName)},${jsAttr(chapterName)})">⚑</button>`;
  }

  // Recursive renderer: processes items starting at `pos` that share `baseIndent`.
  // Returns [html, nextPos] so the caller knows where we stopped.
  function renderGroup(pos, baseIndent) {
    const tag   = items[pos].ordered ? 'ol' : 'ul';
    const parts = [`<${tag}>`];

    while (pos < items.length) {
      const item = items[pos];
      if (item.indent < baseIndent) break;     // dedented — return to parent
      if (item.indent > baseIndent) { pos++; continue; } // orphan, skip

      pos++; // consume this item
      liSeq++;
      const liId  = paraId ? `${paraId}-i${liSeq}` : null;
      const btn   = liId ? liBtn(liId) : '';
      const idAttr = liId ? ` id="${liId}"` : '';

      // If the next item is more deeply indented, recurse for the child group
      if (pos < items.length && items[pos].indent > baseIndent) {
        const [childHtml, nextPos] = renderGroup(pos, items[pos].indent);
        parts.push(`<li${idAttr}>${inlineMd(item.content)}${btn}${childHtml}</li>`);
        pos = nextPos;
      } else {
        parts.push(`<li${idAttr}>${inlineMd(item.content)}${btn}</li>`);
      }
    }

    parts.push(`</${tag}>`);
    return [parts.join(''), pos];
  }

  const [html] = renderGroup(0, items[0].indent);
  return html;
}

// Convert <code>Something.md</code> references to links using resolveDocRef — same
// resolution order as markdown links (book-qualified path, then book-relative path,
// then bare basename). Relies on the module-level _current*/​_global* state set by
// main() before each book's chapters are rendered.
function linkifyMdRefs(html) {
  return html.replace(/<code>([A-Za-z][^<]*?\.md)<\/code>/g, (match, filename) => {
    const href = resolveDocRef(filename);
    if (!href) return match; // no match — leave as-is
    const label = escHtml(filename.replace(/\.md$/i, ''));
    return `<a href="${href}"><code>${label}</code></a>`;
  });
}

function blockToPlain(block, btype) {
  if (btype === 'heading') {
    const m = block.trim().match(/^#+\s+(.+)/);
    return m ? plainText(m[1]) : '';
  }
  if (btype === 'code') return '';
  if (btype === 'table') {
    return (block.match(/\|([^|\n]+)/g) || [])
      .map(c => plainText(c.replace('|', '')))
      .join(' ');
  }
  return plainText(block);
}

// ─── Chapter Parser ───────────────────────────────────────────────────────────

function parseChapter(mdText, bookName, chapterName, paraPrefix) {
  const blocks  = splitBlocks(mdText);
  const parts   = [];
  const entries = [];
  let counter   = 0;
  let section   = null;

  for (const block of blocks) {
    const btype = classifyBlock(block);

    if (btype === 'heading') {
      const { html, text, level } = renderHeading(block);
      parts.push(html);
      if (level === 2) section = text;
      continue;
    }
    if (btype === 'code') { parts.push(renderCode(block)); continue; }
    if (btype === 'hr')   { parts.push('<hr>');            continue; }

    // ── Assignable block ────────────────────────────────────────────────────
    counter++;
    const paraId = `${paraPrefix}-${String(counter).padStart(3, '0')}`;

    let inner;
    switch (btype) {
      case 'table':      inner = renderTable(block);             break;
      case 'ul':         inner = renderListBlock(block, false, paraId, bookName, chapterName);  break;
      case 'ol':         inner = renderListBlock(block, true,  paraId, bookName, chapterName);  break;
      case 'blockquote': {
        // If the last line is an attribution (starts with an em/en dash or "--"),
        // render it as a separate, de-emphasized <cite> instead of folding it into
        // the quote's own text — e.g. a quote followed by "— Speaker Name".
        const rawLines = block.split('\n').map(l => l.replace(/^>\s?/, ''));
        const lastLine = rawLines[rawLines.length - 1].trim();
        const hasCite  = rawLines.length > 1 && /^(--|[—–])\s*\S/.test(lastLine);
        const contentLines = hasCite ? rawLines.slice(0, -1) : rawLines;
        // Split into paragraphs on blank lines (empty > lines become '' after stripping)
        const bqParas = [];
        let bqCurrent = [];
        for (const line of contentLines) {
          if (line.trim() === '') {
            if (bqCurrent.length) { bqParas.push(bqCurrent.join(' ')); bqCurrent = []; }
          } else {
            bqCurrent.push(line);
          }
        }
        if (bqCurrent.length) bqParas.push(bqCurrent.join(' '));
        const bqBody = bqParas.map(p => `<p>${inlineMd(p)}</p>`).join('\n');
        if (hasCite) {
          inner = `<blockquote>${bqBody}<cite>${inlineMd(lastLine)}</cite></blockquote>`;
        } else {
          inner = `<blockquote>${bqBody}</blockquote>`;
        }
        break;
      }
      default: {
        // Support trailing two-space line breaks (markdown hard break = <br>)
        const processed = block.split('\n').map((line, i, arr) => {
          const hasBreak = line.endsWith('  ') && i < arr.length - 1;
          return inlineMd(line.trimEnd()) + (hasBreak ? '<br>' : '');
        }).join('');
        inner = `<p>${processed}</p>`;
        // Para-label rule: <strong> that opens the paragraph (no preceding text)
        // and whose content ends with punctuation gets class="para-label" for
        // CSS gold-colour targeting. CSS alone can't inspect what follows an
        // element, so we stamp the class here at render time.
        inner = inner.replace(
          /^<p>(<strong>)([^<]+[:.!?,—–])(<\/strong>)/,
          '<p><strong class="para-label">$2</strong>'
        );
        break;
      }
    }

    const btn =
      `<button class="report-btn block-report-btn" title="Report an issue with this block" ` +
      `onclick="openReportModal(${jsAttr(paraId)},${jsAttr(bookName)},${jsAttr(chapterName)})">` +
      `⚑ Report Issue</button>`;

    parts.push(`<div class="para-block" id="${paraId}"><div class="para-body">${inner}</div>${btn}</div>`);

    const text = blockToPlain(block, btype);
    if (text) {
      entries.push({ id: paraId, book: bookName, chapter: chapterName, section, text, url: null });
    }
  }

  return { html: parts.join('\n\n'), entries };
}

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────

/** Build a recursive tree from chapters' navPath arrays. */
function buildNavTree(chapters) {
  const root = { children: new Map(), chapters: [] };
  for (const ch of chapters) {
    let node = root;
    for (const seg of (ch.navPath || [])) {
      if (!node.children.has(seg)) {
        node.children.set(seg, { children: new Map(), chapters: [] });
      }
      node = node.children.get(seg);
    }
    node.chapters.push(ch);
  }
  return root;
}

/** Returns true if any chapter at or below this node matches currentUrl. */
function treeContainsActive(node, currentUrl) {
  if (node.chapters.some(ch => ch.url === currentUrl)) return true;
  for (const child of node.children.values()) {
    if (treeContainsActive(child, currentUrl)) return true;
  }
  return false;
}

/** Recursively render a nav tree node to HTML. */
function renderNavNode(node, currentUrl, depth) {
  const parts = [];
  const indent = '  '.repeat(depth + 1);

  for (const ch of node.chapters) {
    const active   = ch.url === currentUrl ? ' class="active"' : '';
    const filename = path.basename(ch.url);
    parts.push(`${indent}<a href="${filename}"${active}>${escHtml(ch.name)}</a>`);
  }

  for (const [name, child] of node.children) {
    const openAttr = treeContainsActive(child, currentUrl) ? ' open' : '';
    parts.push(`${indent}<details class="nav-accordion"${openAttr}>`);
    parts.push(`${indent}  <summary>${escHtml(name)}</summary>`);
    parts.push(renderNavNode(child, currentUrl, depth + 1));
    parts.push(`${indent}</details>`);
  }

  return parts.join('\n');
}

function makeNavHtml(chapters, currentUrl) {
  const tree = buildNavTree(chapters);
  return renderNavNode(tree, currentUrl, 0);
}

// ─── Reader Page Template ─────────────────────────────────────────────────────

// Shared "in development" banner — same markup on the landing page and every
// reader page. `root` is the relative path back to the Website/ directory
// (empty string on the landing page itself).
function devBannerHtml(root) {
  return `<div id="dev-banner">
  <svg class="dev-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
  <span>Velocity is in active development — rules are still changing. <a href="${root}playtesting.html">Help playtest it and leave feedback &rarr;</a></span>
</div>`;
}

function readerPage(contentHtml, chapterName, bookName, bookColor, navHtml, pageUrl, outputAtRoot) {
  const root = depthPrefix(pageUrl);
  const repo  = JSON.stringify(GITHUB_REPO);
  // outputAtRoot pages (About, Playtesting) aren't really "in" a book from a
  // reader's perspective, so skip the redundant " — Site Pages" middle segment.
  const titleSuffix = outputAtRoot ? '' : ` — ${escHtml(bookName)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(chapterName)}${titleSuffix} — Velocity</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap">
  <link rel="icon" type="image/svg+xml" href="${root}favicon.svg">
  <link rel="icon" type="image/png" href="${root}favicon-32.png">
  <link rel="apple-touch-icon" href="${root}apple-touch-icon.png">
  <link rel="stylesheet" href="${root}style.css">
</head>
<body>

${devBannerHtml(root)}

<div id="topbar">
  <a class="topbar-logo" href="${root}index.html">Velocity</a>
  <div class="topbar-search">
    <input type="search" id="search-input"
      placeholder='Search, e.g. &quot;opposition check AND strength&quot;&hellip;'
      autocomplete="off">
    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="7"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
    <div id="search-results" hidden></div>
  </div>
  <a class="topbar-back" href="${root}index.html">&larr; Library</a>
</div>

<div id="sidebar">
  <div class="sidebar-book-title" style="border-left-color:${bookColor}">${escHtml(bookName)}</div>
  <nav>
${navHtml}
  </nav>
</div>

<main id="reader-content">
  <h1 class="chapter-title">${escHtml(chapterName)}</h1>
${contentHtml}
  <footer class="site-footer">
    <a href="${root}about.html">What Makes Velocity Different</a>
    <span class="footer-sep">·</span>
    <a href="${root}playtesting.html">Playtesting &amp; Feedback</a>
    <span class="footer-sep">·</span>
    <a href="${root}legal.html">Legal &amp; Attribution</a>
  </footer>
</main>

<!-- Report Issue Modal -->
<div id="report-modal" class="report-modal-overlay" style="display:none"
     onclick="if(event.target===this)closeReportModal()" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
  <div class="report-modal-card">
    <div class="report-modal-header">
      <span class="report-modal-title" id="report-modal-title">Report an Issue</span>
      <button class="report-modal-close" onclick="closeReportModal()" aria-label="Close">&#x2715;</button>
    </div>
    <div class="report-modal-context" id="report-modal-context"></div>
    <div class="report-modal-body">
      <label class="report-label" for="report-type">Issue Type</label>
      <select class="report-select" id="report-type">
        <option value="error">Error — factual or mechanical mistake</option>
        <option value="suggestion">Suggestion — proposed improvement</option>
        <option value="unclear">Unclear Wording — confusing or ambiguous text</option>
        <option value="missing">Missing Content — something that should be here isn't</option>
      </select>
      <label class="report-label" for="report-desc">Description</label>
      <textarea class="report-textarea" id="report-desc" rows="5" placeholder="Describe the issue…"></textarea>
    </div>
    <div class="report-modal-footer">
      <button class="report-btn-cancel" onclick="closeReportModal()">Cancel</button>
      <button class="report-btn-submit" onclick="submitReportIssue()">Open in GitHub &rarr;</button>
    </div>
  </div>
</div>

<script>
  window.GITHUB_REPO = ${repo};
  var _reportCtx = {};

  function openReportModal(paraId, book, chapter) {
    var el = document.getElementById(paraId);
    var paraText = el ? (el.querySelector('.para-body') || el).innerText.trim() : '';
    _reportCtx = { paraId: paraId, book: book, chapter: chapter, paraText: paraText };
    document.getElementById('report-modal-context').textContent = chapter + '  \u203a  ' + paraId;
    document.getElementById('report-type').value = 'error';
    document.getElementById('report-desc').value = '';
    document.getElementById('report-modal').style.display = 'flex';
    setTimeout(function(){ document.getElementById('report-desc').focus(); }, 50);
  }

  function closeReportModal() {
    document.getElementById('report-modal').style.display = 'none';
  }

  function submitReportIssue() {
    var ctx        = _reportCtx;
    var type       = document.getElementById('report-type').value;
    var desc       = document.getElementById('report-desc').value.trim();
    var typeLabels = { error: 'bug', suggestion: 'enhancement', unclear: 'wording', missing: 'content' };
    var typeNames  = { error: 'Error', suggestion: 'Suggestion', unclear: 'Unclear Wording', missing: 'Missing Content' };
    var pageUrl    = window.location.href.split('#')[0] + '#' + ctx.paraId;
    var title      = '[' + typeNames[type] + '] ' + ctx.chapter + ' \u2014 ' + ctx.paraId;
    var body       =
      '**Type:** '        + typeNames[type]                                                       + '\n' +
      '**Book:** '        + ctx.book                                                              + '\n' +
      '**Chapter:** '     + ctx.chapter                                                           + '\n' +
      '**Paragraph:** '   + ctx.paraId                                                            + '\n' +
      '**Page:** '        + pageUrl                                                               + '\n\n' +
      '**Description:**\n' + (desc || '_(no description provided)_')                             +
      '\n\n---\n**Referenced text:**\n> ' + (ctx.paraText || '_(unavailable)_').replace(/\n/g, '\n> ');
    var labels = 'paragraph-issue,' + typeLabels[type];
    var url = 'https://github.com/' + window.GITHUB_REPO + '/issues/new' +
      '?title='  + encodeURIComponent(title)  +
      '&body='   + encodeURIComponent(body)   +
      '&labels=' + encodeURIComponent(labels);
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    closeReportModal();
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeReportModal();
  });
</script>
<script src="${root}search-index.js"></script>
<script src="${root}search.js"></script>
<script>
  VelocitySearch.init(
    document.getElementById('search-input'),
    document.getElementById('search-results'),
    { indexUrl: '${root}search-index.json', overlay: true }
  );
</script>

</body>
</html>`;
}

// ─── Directory Walker ─────────────────────────────────────────────────────────

function walkMdFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && !entry.startsWith('_')) {
      results.push(...walkMdFiles(full));
    } else if (stat.isFile() && entry.endsWith('.md') && !entry.startsWith('_')) {
      results.push(full);
    }
  }
  return results;
}

function orderChapters(chapters, chapterOrder) {
  if (!chapterOrder || !chapterOrder.length) return chapters;
  // Supports both bare names ('Overview') for top-level chapters and full
  // nav-path keys ("Narrator's Guide/Overview") for nested chapters.
  // Ranked chapters are sorted by their chapterOrder index; unranked chapters
  // follow in their original filesystem order.
  function chapterKey(ch) {
    return ch.navPath.length ? ch.navPath.join('/') + '/' + ch.name : ch.name;
  }

  const ranked = [], unranked = [];
  for (const ch of chapters) {
    const idx = chapterOrder.indexOf(chapterKey(ch));
    if (idx === -1) unranked.push(ch);
    else ranked.push({ ch, idx });
  }
  ranked.sort((a, b) => a.idx - b.idx);
  return [...ranked.map(r => r.ch), ...unranked];
}

// files (optional): a Set of basenames (without .md) to include. When provided,
// only those files are collected and subdirectory traversal is skipped entirely.
function collectChapters(sourceDir, navExclude, chapterOrder, files) {
  const chapters = [];
  if (!fs.existsSync(sourceDir)) {
    console.warn(`  ⚠  Source not found: ${sourceDir}`);
    return chapters;
  }

  // 'Universal' is a structural wrapper dir — transparent to nav grouping.
  const NAV_TRANSPARENT = new Set(['Universal']);

  function walk(dir, navPath) {
    const entries = fs.readdirSync(dir).sort();
    // Files first (so index pages appear before sub-group accordions)
    for (const entry of entries) {
      const full = path.join(dir, entry);
      if (!fs.statSync(full).isFile()) continue;
      if (!entry.endsWith('.md') || entry.startsWith('_')) continue;
      const name = path.basename(entry, '.md');
      if (navExclude && navExclude.has(name)) continue;
      if (files && !files.has(name)) continue;
      chapters.push({ name, navPath: [...navPath], mdPath: full });
    }
    // Subdirs next — skip entirely when a files allowlist is active
    if (!files) {
      for (const entry of entries) {
        const full = path.join(dir, entry);
        if (!fs.statSync(full).isDirectory()) continue;
        if (entry.startsWith('_') || SKIP_DIRS.has(entry)) continue;
        const childNav = NAV_TRANSPARENT.has(entry) ? navPath : [...navPath, entry];
        walk(full, childNav);
      }
    }
  }

  walk(sourceDir, []);
  return orderChapters(chapters, chapterOrder);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const allEntries = [];

  // ── Pass 1: collect chapters for every book up front, and build the lookup
  // indexes resolveDocRef uses to resolve cross-references unambiguously:
  //   - fullPathIndex: vault-relative normalized path (book name + any nested
  //     folders) -> chapter. Lets book-qualified references like
  //     "Player's Guide/Introduction.md" resolve correctly even when another
  //     book (e.g. Core Rules) has a chapter with the exact same name.
  //   - localPathIndex: per book, path relative to that book's own source root
  //     -> chapter slug. Lets intra-book references that include a subfolder
  //     but omit the book name (e.g. "Encounters/Conditions.md") resolve.
  //   - globalFileMap / per-book fileMap (built in Pass 2): basename-only,
  //     kept as a last resort for bare references like "Conditions.md" (first
  //     book to claim a basename wins any collision, same as before).
  const bookChapters   = new Map();
  const globalFileMap  = {};
  const fullPathIndex  = new Map();
  const localPathIndex = new Map();

  for (const book of BOOKS) {
    const chapters = collectChapters(book.source, book.navExclude, book.chapterOrder, book.files).map(ch => {
      const slug = fileSlug(ch.mdPath, book.source);
      const url  = book.outputAtRoot ? `${slug}.html` : `reader/${book.slug}/${slug}.html`;
      return { ...ch, slug, url };
    });
    bookChapters.set(book, chapters);

    const localMap = new Map();
    for (const ch of chapters) {
      const key = slugify(path.basename(ch.mdPath, '.md'));
      if (!(key in globalFileMap)) {
        globalFileMap[key] = ch.url;
      }

      const fullKey = normalizeRefPath(path.relative(PROJECT_ROOT, ch.mdPath));
      if (!fullPathIndex.has(fullKey)) {
        fullPathIndex.set(fullKey, { book, ch });
      }

      const localKey = normalizeRefPath(path.relative(book.source, ch.mdPath));
      localMap.set(localKey, ch.url);
    }
    localPathIndex.set(book, localMap);
  }

  // ── Pass 2: render every page.
  for (const book of BOOKS) {
    // outputAtRoot books (e.g. the Site Pages book backing about.html /
    // playtesting.html) write directly into Website/ instead of
    // Website/reader/<slug>/, so their existing short URLs keep working.
    const outDir = book.outputAtRoot ? SCRIPT_DIR : path.join(SCRIPT_DIR, 'reader', book.slug);
    fs.mkdirSync(outDir, { recursive: true });

    console.log(`\n📚  ${book.name}`);

    const chapters = bookChapters.get(book);

    // Local filename-slug → output-filename map (same-book references take
    // priority over the global map — see linkifyMdRefs).
    const fileMap = {};
    for (const ch of chapters) {
      const key = slugify(path.basename(ch.mdPath, '.md'));
      fileMap[key] = ch.url;
    }

    _currentFileMap = fileMap;
    _currentBook    = book;
    _fullPathIndex  = fullPathIndex;
    _localPathIndex = localPathIndex;
    _globalFileMap  = globalFileMap;
    for (const ch of chapters) {
      _currentPageUrl = ch.url;
      console.log(`  →  ${ch.name}`);

      let mdText = fs.readFileSync(ch.mdPath, 'utf8');

      // Strip leading H1 — it becomes the page's chapter-title h1
      let chapterName = ch.name;
      const lines = mdText.trimStart().split('\n');
      if (lines[0] && lines[0].startsWith('# ')) {
        chapterName = lines[0].slice(2).trim();
        mdText = lines.slice(1).join('\n').trimStart();
      }

      const paraPrefix = `${book.id}-${ch.slug}`;
      let { html: contentHtml, entries } = parseChapter(
        mdText, book.name, chapterName, paraPrefix
      );

      // Resolve bare `FileName.md` code-span references to hyperlinks — see
      // resolveDocRef for the full resolution order.
      contentHtml = linkifyMdRefs(contentHtml);

      for (const e of entries) e.url = '/' + ch.url + '#' + e.id;
      allEntries.push(...entries);

      const pageHtml = readerPage(
        contentHtml, chapterName, book.name,
        book.color, makeNavHtml(chapters, ch.url), ch.url, book.outputAtRoot
      );

      fs.writeFileSync(path.join(outDir, `${ch.slug}.html`), pageHtml, 'utf8');
    }

    // Remove stale HTML files — pages that exist on disk but have no source .md
    // any more. Skipped for outputAtRoot books: their outDir is the Website
    // root itself, which also holds hand-maintained files (index.html,
    // legal.html, character-sheet.html, style.css, ...) that must never be
    // swept up by this cleanup.
    if (!book.outputAtRoot) {
      const generatedFiles = new Set(chapters.map(ch => `${ch.slug}.html`));
      for (const file of fs.readdirSync(outDir)) {
        if (file.endsWith('.html') && !generatedFiles.has(file)) {
          try {
            fs.unlinkSync(path.join(outDir, file));
            console.log(`  ✗  Removed stale page: ${file}`);
          } catch (e) {
            console.warn(`  ⚠  Could not remove stale page (delete manually): ${file}`);
          }
        }
      }
    }
  }

  // Write search index (JSON for server use, JS for file:// use)
  fs.writeFileSync(path.join(SCRIPT_DIR, 'search-index.json'), JSON.stringify(allEntries, null, 2), 'utf8');
  fs.writeFileSync(path.join(SCRIPT_DIR, 'search-index.js'), 'window.SEARCH_INDEX = ' + JSON.stringify(allEntries) + ';', 'utf8');

  // Write sitemap.xml — all generated pages + known hand-maintained root pages
  const STATIC_PAGES = [
    'index.html',
    'about.html',
    'playtesting.html',
    'legal.html',
    'character-sheet.html',
    'character-sheet-reference.html',
    'skill-trees.html',
    'd20.html',
  ];
  const generatedUrls = new Set();
  for (const [, chapters] of bookChapters) {
    for (const ch of chapters) generatedUrls.add(ch.url);
  }
  const allUrls = [
    ...STATIC_PAGES,
    ...[...generatedUrls],
  ];
  const today = new Date().toISOString().slice(0, 10);
  const sitemapXml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    allUrls.map(u =>
      `  <url>\n    <loc>${SITE_URL}/${u}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`
    ).join('\n') +
    '\n</urlset>\n';
  fs.writeFileSync(path.join(SCRIPT_DIR, 'sitemap.xml'), sitemapXml, 'utf8');
  console.log(`    Sitemap written to: sitemap.xml (${allUrls.length} URLs)`);

  const pageCount = new Set(allEntries.map(e => e.url.split('#')[0])).size;

  console.log(`\n✅  Done — ${allEntries.length} paragraphs indexed across ${pageCount} pages.`);
  console.log('    Index written to: search-index.json');
  console.log();
  console.log('    Next steps:');
  console.log('    1. Confirm GITHUB_REPO at the top of build.js matches your actual org/repo.');
  console.log('    2. Enable GitHub Pages (repo Settings → Pages → Source: GitHub Actions).');
  console.log('    3. Push to GitHub — the deploy workflow builds and publishes automatically.');
  console.log();
}

main();
