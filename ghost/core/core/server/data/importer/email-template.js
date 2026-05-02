const tpl = require('@tryghost/tpl');

module.exports = ({result, siteUrl, postsUrl, emailRecipient}) => {
    return tpl`
        ${result?.data?.errors ? `Import unsuccessful: ${result.data.errors[0].message}` : 'Your content import has finished successfully'}
        [Ghost Community Forum](https://forum.ghost.org/)
        [View posts](${postsUrl.href})
        This email was sent from [${siteUrl.host}](${siteUrl.href}) to [${emailRecipient}](mailto:${emailRecipient})
    `;
};
