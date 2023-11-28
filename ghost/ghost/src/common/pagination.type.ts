export type Pagination = {
    page: number;
    limit: number | 'all';
    pages: number;
    total: number;
    prev: number | null,
    next: number | null
};
