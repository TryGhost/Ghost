// Fetches a site front-end page rendered with the given `x-ghost-preview` data.
// This targets the front-end, not the Admin API, so it stays a plain fetch.
export function fetchFrontendPreview(url: string, previewData: string): Promise<string> {
  // Suppress the admin toolbar in previews
  const previewUrl = new URL(url);
  previewUrl.searchParams.set('admin_toolbar', '0');

  // eslint-disable-next-line no-restricted-syntax -- targets the site front-end, not the Admin API
  return fetch(previewUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'x-ghost-preview': previewData,
      Accept: 'text/html',
    },
    mode: 'cors',
    credentials: 'include',
  }).then((response) => response.text());
}
