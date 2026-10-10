/** Remove Ghost attribution parameters, optionally producing a compact display URL. */
export const cleanTrackedUrl = (url: string, display = false): string => {
  try {
    const removeParams = ['ref', 'attribution_id', 'attribution_type'];
    const urlObj = new URL(url);
    for (const param of removeParams) {
      urlObj.searchParams.delete(param);
    }

    if (!display) {
      return urlObj.toString();
    }
    const urlWithoutProtocol =
      urlObj.host +
      (urlObj.pathname === '/' && !urlObj.search ? '' : urlObj.pathname) +
      (urlObj.search ? urlObj.search : '') +
      (urlObj.hash ? urlObj.hash : '');
    return urlWithoutProtocol.replace(/^www\./, '');
  } catch {
    return url;
  }
};
