import type { ImportRun, RowStatus } from './store';
import buildImportReport from './report';
import buildErrorsFile from './errors-file';

const { slugify } = require('@tryghost/string');

const IMPORTED_POST_PREVIEW_LIMIT = 10;

export interface CompletionEmailPayload {
  to: string;
  subject: string;
  html: string;
  forceTextContent: boolean;
  attachments: Array<{
    filename: string;
    content: string;
    contentType: string;
    contentDisposition: string;
  }>;
}

type OutcomeCounts = Record<RowStatus, number> & { warningRows: number };

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function countsFor(run: ImportRun): OutcomeCounts {
  const counts: OutcomeCounts = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    warningRows: 0,
  };

  for (const row of run.rows) {
    counts[row.status] += 1;
    if (row.warnings?.length) {
      counts.warningRows += 1;
    }
  }

  return counts;
}

function headingFor(run: ImportRun, counts: OutcomeCounts): string {
  if (run.status === 'failed') {
    return 'Your content import could not be completed';
  }
  if (counts.failed > 0 && counts.created + counts.updated === 0) {
    return 'Your content import was unsuccessful';
  }
  return 'Your content import is complete';
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function summaryItems(counts: OutcomeCounts): string {
  const items = [
    ['Created', counts.created],
    ['Updated', counts.updated],
    ['Skipped', counts.skipped],
    ['Failed', counts.failed],
  ];

  return items
    .map(
      ([label, count]) =>
        `<li style="margin-bottom: 6px;"><strong>${label}:</strong> ${formatNumber(count as number)}</li>`,
    )
    .join('');
}

function importTagSlug(runId: string): string {
  // Internal tag slugs replace the leading # with "hash-" in the model layer.
  return slugify(`#Import Run ${runId}`.replace(/^#/, 'hash-'));
}

function importedPostLinks(run: ImportRun, adminUrl: string): string {
  const importedRows = run.rows.filter(
    (row) => row.status === 'created' || row.status === 'updated',
  );
  if (!importedRows.length) {
    return '';
  }

  const rows = importedRows.filter((row) => row.url);
  const previewRows = rows.slice(0, IMPORTED_POST_PREVIEW_LIMIT);

  const links = previewRows
    .map((row) => {
      const title = escapeHTML(row.title || `Row ${row.line}`);
      return `<li style="margin-bottom: 6px;"><a href="${escapeHTML(row.url as string)}" style="color: #3A464C;">${title}</a></li>`;
    })
    .join('');
  const remaining = importedRows.length - previewRows.length;
  const remainingCopy = remaining
    ? `<p style="font-size: 16px; line-height: 25px; color: #3A464C;">Including ${formatNumber(remaining)} more.</p>`
    : '';
  const tag = encodeURIComponent(importTagSlug(run.id));
  const postsUrl = escapeHTML(new URL(`#/posts?tag=${tag}`, adminUrl).href);
  const pagesUrl = escapeHTML(new URL(`#/pages?tag=${tag}`, adminUrl).href);
  const preview = links
    ? `<ul style="font-size: 16px; line-height: 25px; color: #3A464C; padding-left: 24px;">${links}</ul>`
    : '';

  return `<h2 style="color: #15212A; font-size: 18px; line-height: 24px; margin: 32px 0 12px;">Imported posts and pages</h2>
      ${preview}
      ${remainingCopy}
      <p style="font-size: 16px; line-height: 25px; color: #3A464C;"><a href="${postsUrl}" style="color: #3A464C;">View imported posts</a> · <a href="${pagesUrl}" style="color: #3A464C;">View imported pages</a></p>`;
}

function renderCompletionEmail(run: ImportRun, recipient: string, adminUrl: string): string {
  const counts = countsFor(run);
  const heading = headingFor(run, counts);
  const warningCopy = counts.warningRows
    ? `<p style="font-size: 16px; line-height: 25px; color: #3A464C;"><strong>${formatNumber(counts.warningRows)}</strong> ${counts.warningRows === 1 ? 'post has' : 'posts have'} warnings.</p>`
    : '';
  const failureCopy =
    run.status === 'failed'
      ? '<p style="font-size: 16px; line-height: 25px; color: #3A464C;">Something went wrong on our end before the import could finish. There is nothing wrong with your file, and it is safe to try again.</p>'
      : '';
  const escapedRecipient = escapeHTML(recipient);

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>${heading}</title>
  </head>
  <body style="background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #3A464C; margin: 0; padding: 0;">
    <div style="box-sizing: border-box; margin: 0 auto; max-width: 540px; padding: 40px 20px;">
      <img src="https://static.ghost.org/v4.0.0/images/ghost-orb-4.png" width="60" height="60" alt="Ghost" style="display: block; margin: 0 auto 40px;" />
      <h1 style="color: #15212A; font-size: 21px; line-height: 25px; margin: 0 0 24px;">${heading}</h1>
      ${failureCopy}
      <p style="font-size: 16px; line-height: 25px; color: #3A464C;">The import processed ${formatNumber(run.total)} ${run.total === 1 ? 'row' : 'rows'}:</p>
      <ul style="font-size: 16px; line-height: 25px; color: #3A464C; padding-left: 24px;">${summaryItems(counts)}</ul>
      ${warningCopy}
      ${importedPostLinks(run, adminUrl)}
      <p style="color: #738A94; font-size: 11px; line-height: 18px; margin-top: 64px;">This email was sent to <a href="mailto:${escapedRecipient}" style="color: #738A94;">${escapedRecipient}</a>.</p>
    </div>
  </body>
</html>`;
}

export default function buildCompletionEmail(
  run: ImportRun,
  recipient: string,
  adminUrl: string,
): CompletionEmailPayload {
  const counts = countsFor(run);
  const report = buildImportReport(run);
  const errorsFile = buildErrorsFile(run);
  const attachments: CompletionEmailPayload['attachments'] = [];
  if (report) {
    attachments.push({
      filename: 'report.csv',
      content: report,
      contentType: 'text/csv',
      contentDisposition: 'attachment',
    });
  }
  if (errorsFile) {
    attachments.push({
      filename: 'errors.csv',
      content: errorsFile,
      contentType: 'text/csv',
      contentDisposition: 'attachment',
    });
  }
  return {
    to: recipient,
    subject: headingFor(run, counts),
    html: renderCompletionEmail(run, recipient, adminUrl),
    forceTextContent: true,
    attachments,
  };
}
