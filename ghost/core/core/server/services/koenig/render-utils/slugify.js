function slugify(str) {
    // Remove HTML tags
    str = str.replace(/<[^>]*>?/gm, '');

    // Remove any non-word character with whitespace
    str = str.replace(/[^\w\s]/gi, '');

    // Replace any whitespace character with a dash
    str = str.replace(/\s+/g, '-');

    // Convert to lowercase
    str = str.toLowerCase();

    return str;
}

module.exports = {
    slugify
};
