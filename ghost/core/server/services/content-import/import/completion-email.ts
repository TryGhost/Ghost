import type { ImportSummary, OutcomeCounts } from './summary';
import type { ImportReportContents, ImportReportName } from './journal-report';

const { slugify } = require('@tryghost/string');

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

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function headingFor(run: ImportSummary, counts: OutcomeCounts): string {
  if (run.status === 'cancelled') {
    return 'Your content import was cancelled';
  }
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

function summaryItems(counts: OutcomeCounts, errorDelivery?: 'attachment' | 'download'): string {
  const items: Array<[string, number]> = [
    ['Created', counts.created],
    ['Updated', counts.updated],
    ['Skipped', counts.skipped],
    ['Failed', counts.failed],
  ];

  return items
    .map(([label, count]) => {
      const guidance =
        label === 'Failed' && errorDelivery
          ? { attachment: ' (see attached errors.csv)', download: ' (see linked errors.csv)' }[
              errorDelivery
            ]
          : '';
      return `<li style="margin-bottom: 6px;"><strong>${label}:</strong> ${formatNumber(count)}${guidance}</li>`;
    })
    .join('');
}

function importTagSlug(runId: string): string {
  // Internal tag slugs replace the leading # with "hash-" in the model layer.
  return slugify(`#Import Run ${runId}`.replace(/^#/, 'hash-'));
}

function importedPostLinks(run: ImportSummary, adminUrl: string): string {
  const { counts, previewRows, hasPages, hasPosts } = run;
  const imported = counts.created + counts.updated;
  if (!imported) {
    return '';
  }

  const links = previewRows
    .map((row) => {
      const title = escapeHTML(row.title || `Row ${row.line}`);
      return `<li style="margin-bottom: 6px;"><a href="${escapeHTML(row.url as string)}" style="color: #3A464C;">${title}</a></li>`;
    })
    .join('');
  const remaining = imported - previewRows.length;
  const remainingCopy = remaining
    ? `<p style="font-size: 16px; line-height: 25px; color: #3A464C;">Including ${formatNumber(remaining)} more.</p>`
    : '';
  const tag = encodeURIComponent(importTagSlug(run.id));
  const postsUrl = escapeHTML(new URL(`#/posts?tag=${tag}`, adminUrl).href);
  const pagesUrl = escapeHTML(new URL(`#/pages?tag=${tag}`, adminUrl).href);
  let heading = 'Imported posts';
  if (hasPages) {
    heading = hasPosts ? 'Imported posts and pages' : 'Imported pages';
  }
  const filteredLinks = [
    hasPosts ? `<a href="${postsUrl}" style="color: #3A464C;">View imported posts</a>` : '',
    hasPages ? `<a href="${pagesUrl}" style="color: #3A464C;">View imported pages</a>` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const preview = links
    ? `<ul style="font-size: 16px; line-height: 25px; color: #3A464C; padding-left: 24px;">${links}</ul>`
    : '';

  return `<h2 style="color: #15212A; font-size: 18px; line-height: 24px; margin: 32px 0 12px;">${heading}</h2>
      ${preview}
      ${remainingCopy}
      <p style="font-size: 16px; line-height: 25px; color: #3A464C;">${filteredLinks}</p>`;
}

function renderCompletionEmail(
  run: ImportSummary,
  recipient: string,
  adminUrl: string,
  reports: ImportReportContents,
): string {
  const { counts } = run;
  const heading = headingFor(run, counts);
  const warningCopy = counts.warningRows
    ? `<p style="font-size: 16px; line-height: 25px; color: #3A464C;"><strong>${formatNumber(counts.warningRows)}</strong> ${counts.warningRows === 1 ? 'post has' : 'posts have'} warnings.</p>`
    : '';
  const failureCopy =
    run.status === 'failed'
      ? '<p style="font-size: 16px; line-height: 25px; color: #3A464C;">Something went wrong on our end before the import could finish. There is nothing wrong with your file, and it is safe to try again.</p>'
      : '';
  const escapedRecipient = escapeHTML(recipient);
  const errorDelivery = reports.errorsFile
    ? 'attachment'
    : reports.downloads?.includes('errors.csv')
      ? 'download'
      : undefined;

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
      ${run.status === 'cancelled' ? '<p style="font-size: 16px; line-height: 25px; color: #3A464C;">Already imported posts and pages have been kept. Remaining rows were not imported. The results below cover only the rows that were processed.</p>' : ''}
      <p style="font-size: 16px; line-height: 25px; color: #3A464C;">The import processed ${formatNumber(run.total)} ${run.total === 1 ? 'row' : 'rows'}:</p>
      <ul style="font-size: 16px; line-height: 25px; color: #3A464C; padding-left: 24px;">${summaryItems(counts, errorDelivery)}</ul>
      ${warningCopy}
      ${importedPostLinks(run, adminUrl)}
      ${reportLinks(run.id, adminUrl, reports.downloads)}
      <p style="color: #738A94; font-size: 11px; line-height: 18px; margin-top: 64px;">This email was sent to <a href="mailto:${escapedRecipient}" style="color: #738A94;">${escapedRecipient}</a>.</p>
    </div>
  </body>
</html>`;
}

function reportLinks(id: string, adminUrl: string, files?: ImportReportName[]): string {
  if (!files?.length) {
    return '';
  }
  const links = files
    .map((filename) => {
      const url = new URL(
        `#/settings/content-import-reports/${encodeURIComponent(id)}/${filename}`,
        adminUrl,
      );
      return `<a href="${escapeHTML(url.href)}" style="color: #3A464C;">Download ${filename}</a>`;
    })
    .join(' · ');
  return `<p style="font-size: 16px; line-height: 25px; color: #3A464C;">${links}. Available for seven days.</p>`;
}

export default function buildCompletionEmail(
  run: ImportSummary,
  recipient: string,
  adminUrl: string,
  reports: ImportReportContents,
): CompletionEmailPayload {
  const { report, errorsFile } = reports;
  const { counts } = run;
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
    html: renderCompletionEmail(run, recipient, adminUrl, reports),
    forceTextContent: true,
    attachments,
  };
}
