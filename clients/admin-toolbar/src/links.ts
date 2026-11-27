export function adminHref(adminUrl: string, path: string) {
  const cleanPath = path.replace(/^\/+/, '');
  return `${adminUrl}#/${cleanPath}`;
}

export function commentsHref(adminUrl: string, postId: string) {
  return adminHref(adminUrl, `comments?filter=${encodeURIComponent(`post_id:${postId}`)}`);
}

export function hideToolbarHref() {
  const url = new URL(window.location.href);
  url.searchParams.set('admin', '0');
  return `${url.pathname}${url.search}${url.hash}`;
}
