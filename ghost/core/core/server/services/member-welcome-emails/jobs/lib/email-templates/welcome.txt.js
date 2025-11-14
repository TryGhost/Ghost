module.exports = ({memberName, siteTitle, siteUrl}) => `
Welcome to ${siteTitle}!

Hi ${memberName || 'there'},

Thanks for joining! We're excited to have you as part of our community.

Visit ${siteTitle}: ${siteUrl}

---

Sent to you because you signed up at ${siteTitle}.
`;

