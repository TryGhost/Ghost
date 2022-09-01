const slugFilterOrder = (table, filter) => {
    let orderMatch = filter.match(/slug:\s?\[(.*)\]/);

    if (orderMatch) {
        let orderSlugs = orderMatch[1].split(',');
        let order = 'CASE ';

        orderSlugs.forEach((slug, index) => {
            order += `WHEN \`${table}\`.\`slug\` = '${slug}' THEN ${index} `;
        });

        order += 'END ASC';

        return order;
    }
};

module.exports = slugFilterOrder;
