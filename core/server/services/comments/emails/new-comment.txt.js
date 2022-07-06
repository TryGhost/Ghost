module.exports = function (data) {
    return `
        Hey there!

        Tap the link below to complete the signup process for ${data.siteTitle}, and be automatically signed in:

        ${data.url}

        For your security, the link will expire in 24 hours time.

        See you soon!

        ---

        Sent to ${data.email}
        If you did not make this request, you can simply delete this message. You will not be signed up, and no account will be created for you.
    `;
};
