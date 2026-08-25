/**
 * @param {'public'|'private'|'noCache'} profile Use "private" if you do not want caching
 * @param {object} [options]
 * @param {number} [options.maxAge] The max-age in seconds to use when profile is "public"
 */
const cacheControl = (profile, options = { maxAge: 0 }) => {
  const profiles = {
    public: `public, max-age=${options.maxAge}`,
    noCache:
      'no-cache, max-age=0, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0',
    private: 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0',
  };

  const value = profiles[profile];

  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {() => void} next
   *
   * @returns {void}
   */
  return function cacheControlHeaders(req, res, next) {
    res.setHeader('Cache-Control', value);
    next();
  };
};

exports.cacheControl = cacheControl;
