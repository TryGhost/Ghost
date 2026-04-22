const slugFilterOrder = (table, filter) => {
    let orderMatch = filter.match(/slug:\s?\[(.*)\]/);

    if (orderMatch) {
        let orderSlugs = orderMatch[1].split(',');
        let caseParts = [];
        let bindings = [];

        orderSlugs.forEach((slug, index) => {
            caseParts.push(`WHEN \`${table}\`.\`slug\` = ? THEN ?`);
            bindings.push(slug.trim(), index);
        });

        return {
            sql: `CASE ${caseParts.join(' ')} END ASC`,
            bindings
        };
    }
};

module.exports = slugFilterOrder;
