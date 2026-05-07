${(() => {
    const escapeHtml = (unsafe) => (unsafe || '').toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    const errors = result?.data?.errors;
    const hasErrors = errors && Array.isArray(errors) && errors.length > 0;
    if (hasErrors) {
        const msg = errors[0].message || errors[0].toString() || 'Unknown error';
        return `Import unsuccessful: ${escapeHtml(msg)}`;
    }
    return 'Your content import has finished successfully';
})()}

[Ghost Community Forum](https://forum.ghost.org/)
[View posts](${postsUrl.href})

This email was sent from [${siteUrl.host}](${siteUrl.href}) to [${emailRecipient}](mailto:${emailRecipient})
