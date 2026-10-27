const OPEN_PARAM = 'open';

/** Links to a Settings section and opens it, as its header button would. */
export const openSectionPath = (navid: string) => `/settings/${navid}?${OPEN_PARAM}`;

export const isOpenSectionRequest = (search: string) => new URLSearchParams(search).has(OPEN_PARAM);
