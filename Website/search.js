/* Velocity TTRPG — Search
 *
 * AND phrase search over search-index.json.
 *
 * Query syntax:
 *   opposition check AND strength
 *   → returns paragraphs containing BOTH the phrase "opposition check"
 *     AND the word/phrase "strength" (exact, case-insensitive)
 *
 * Usage:
 *   VelocitySearch.init(inputElement, resultsElement [, options])
 *
 * Options:
 *   indexUrl   Path to search-index.json (default: '/search-index.json')
 *   overlay    If true, adds 'reader-search-results' class to results element
 */

(function () {
  'use strict';

  let cachedIndex = null;

  /* ── Utilities ──────────────────────────────────────────────────────────── */

  function escHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── Index Loading ──────────────────────────────────────────────────────── */

  async function loadIndex(url) {
    if (cachedIndex) return cachedIndex;
    /* If the index was pre-loaded as a <script> tag (needed for file:// URLs
       where fetch() is blocked), use it directly. */
    if (window.SEARCH_INDEX) {
      cachedIndex = window.SEARCH_INDEX;
      return cachedIndex;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      cachedIndex = await res.json();
      return cachedIndex;
    } catch (e) {
      console.error('[VelocitySearch] Failed to load index from ' + url + ':', e);
      return [];
    }
  }

  /* ── Query Parsing ──────────────────────────────────────────────────────── */

  function parsePhrases(query) {
    /* Split on AND (case-insensitive word boundary), trim, drop empties. */
    return query
      .split(/\bAND\b/i)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  /* ── Search ─────────────────────────────────────────────────────────────── */

  function runSearch(query, index) {
    var phrases = parsePhrases(query);
    if (!phrases.length) return [];

    return index.filter(function (entry) {
      var lower = entry.text.toLowerCase();
      return phrases.every(function (phrase) {
        return lower.includes(phrase.toLowerCase());
      });
    });
  }

  /* ── Snippet + Highlighting ─────────────────────────────────────────────── */

  function makeSnippet(text, phrases, maxLen) {
    maxLen = maxLen || 200;

    /* Find the position of the first phrase to centre the snippet. */
    var start = 0;
    for (var i = 0; i < phrases.length; i++) {
      var idx = text.toLowerCase().indexOf(phrases[i].toLowerCase());
      if (idx !== -1) {
        start = Math.max(0, idx - 80);
        break;
      }
    }

    var raw = text.slice(start, start + maxLen);
    var prefix = start > 0 ? '…' : '';
    var suffix = start + maxLen < text.length ? '…' : '';

    /* HTML-escape the snippet, then inject <mark> for each phrase. */
    var escaped = escHtml(raw);
    phrases.forEach(function (phrase) {
      var re = new RegExp(
        phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'gi'
      );
      escaped = escaped.replace(re, '<mark>$&</mark>');
    });

    return prefix + escaped + suffix;
  }

  /* ── Result Rendering ───────────────────────────────────────────────────── */

  function renderResults(results, query, container) {
    var phrases = parsePhrases(query);

    if (!results.length) {
      container.innerHTML =
        '<p class="search-empty">No results for <em>' + escHtml(query) + '</em>.' +
        ' Try adjusting your phrasing — each AND term must appear exactly as written.</p>';
      return;
    }

    var count = results.length;
    var html = '<p class="search-count">' + count +
      ' result' + (count === 1 ? '' : 's') + '</p>';

    html += '<table class="search-table">' +
      '<thead><tr>' +
      '<th class="col-source">Source</th>' +
      '<th class="col-section">Section</th>' +
      '<th class="col-text">Text</th>' +
      '</tr></thead><tbody>';

    results.forEach(function (entry) {
      var snippet = makeSnippet(entry.text, phrases);
      var url = escHtml(entry.url);
      html +=
        '<tr class="search-row" onclick="location.href=\'' + url + '\'" tabindex="0">' +
          '<td class="col-source">' + escHtml(entry.book) + '</td>' +
          '<td class="col-section">' + escHtml(entry.chapter) +
            (entry.section ? '<span class="result-section">' + escHtml(entry.section) + '</span>' : '') +
          '</td>' +
          '<td class="col-text">' + snippet + '</td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */

  window.VelocitySearch = {
    /**
     * Wire up a search input and results container.
     *
     * @param {HTMLElement} inputEl    - <input type="search"> element
     * @param {HTMLElement} resultsEl  - container for results
     * @param {object}      [opts]     - { indexUrl, overlay }
     */
    init: function (inputEl, resultsEl, opts) {
      opts = opts || {};
      var indexUrl = opts.indexUrl || '/search-index.json';

      if (opts.overlay) {
        resultsEl.classList.add('reader-search-results');
      }

      var debounce;

      inputEl.addEventListener('input', function () {
        clearTimeout(debounce);
        var q = inputEl.value.trim();

        if (!q) {
          resultsEl.innerHTML = '';
          resultsEl.hidden = true;
          return;
        }

        debounce = setTimeout(function () {
          loadIndex(indexUrl).then(function (index) {
            var results = runSearch(q, index);
            renderResults(results, q, resultsEl);
            resultsEl.hidden = false;
          });
        }, 240);
      });

      /* Close results when user clicks outside. */
      document.addEventListener('click', function (e) {
        if (!inputEl.contains(e.target) && !resultsEl.contains(e.target)) {
          resultsEl.hidden = true;
        }
      });

      inputEl.addEventListener('focus', function () {
        if (resultsEl.textContent.trim()) {
          resultsEl.hidden = false;
        }
      });
    }
  };

})();
