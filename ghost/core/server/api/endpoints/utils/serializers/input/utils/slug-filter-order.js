const slugFilterOrder = (table, filter) => {
  const orderMatch = filter.match(/slug:\s?\[(.*)\]/);

  if (orderMatch) {
    const orderSlugs = orderMatch[1].split(',');
    const caseParts = [];
    const bindings = [];

    orderSlugs.forEach((slug, index) => {
      caseParts.push(`WHEN \`${table}\`.\`slug\` = ? THEN ?`);
      bindings.push(slug.trim(), index);
    });

    return {
      sql: `CASE ${caseParts.join(' ')} END ASC`,
      bindings,
    };
  }
};

module.exports = slugFilterOrder;
