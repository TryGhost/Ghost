function formatNewsletterResponse(newsletters) {
  return newsletters.map(({ id, uuid, name, description, sort_order: sortOrder }) => {
    return {
      id,
      uuid,
      name,
      description,
      sort_order: sortOrder,
    };
  });
}

module.exports.formatNewsletterResponse = formatNewsletterResponse;
