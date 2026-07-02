/**
 * Report Issue modal — shared logic for every reader page.
 *
 * This used to be regenerated inline on every single generated page by
 * build.js's readerPage() template. That meant the code lived inside
 * build.js's own JS template literal, so escape sequences meant for THIS
 * script's own strings (like '\n') were consumed by build.js's template
 * literal parsing before they ever reached the page — silently corrupting
 * them into raw newline characters and producing invalid JS (unterminated
 * string literals) on every single generated page, which broke every
 * Report Issue button and badge site-wide.
 *
 * Living here as a real, standalone .js file sidesteps that class of bug
 * entirely: this file is written and served as-is, with no intermediate
 * template-literal layer to strip escapes out from under it.
 *
 * Depends on window.GITHUB_REPO, which each page sets via a small inline
 * <script> immediately before loading this file.
 */

var _reportCtx = {};

function openReportModal(paraId, book, chapter) {
  var el = document.getElementById(paraId);
  var paraText = el ? (el.querySelector('.para-body') || el).innerText.trim() : '';
  _reportCtx = { paraId: paraId, book: book, chapter: chapter, paraText: paraText };
  document.getElementById('report-modal-context').textContent = chapter + '  ›  ' + paraId;
  document.getElementById('report-type').value = 'error';
  document.getElementById('report-desc').value = '';
  document.getElementById('report-modal').style.display = 'flex';
  setTimeout(function () { document.getElementById('report-desc').focus(); }, 50);
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
  var title      = '[' + typeNames[type] + '] ' + ctx.chapter + ' — ' + ctx.paraId;
  var body       =
    '**Type:** '        + typeNames[type]                                                       + '\n' +
    '**Book:** '        + ctx.book                                                              + '\n' +
    '**Chapter:** '     + ctx.chapter                                                           + '\n' +
    '**Paragraph:** '   + ctx.paraId                                                            + '\n' +
    '**Page:** '        + pageUrl                                                               + '\n\n' +
    '**Description:**\n' + (desc || '_(no description provided)_')                              +
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

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeReportModal();
});
