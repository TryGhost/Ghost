module.exports = {
    public: 'public, max-age=0',
    hour: 'public, max-age=' + 3600,
    day: 'public, max-age=' + 86400,
    year: 'public, max-age=' + 31536000,
    yearImmutable: 'public, max-age=' + 31536000 + ', immutable',
    private: 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0',
    noCache: 'no-cache, max-age=0, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
};
