module.exports = function (data) {
    return `
        Hey there,

        Someone just posted a comment on your post "${data.postTitle}"

        ${data.postUrl}#comments-area

        ---

        Sent to ${data.toEmail} from ${data.siteDomain}.
        You can manage your notification preferences at ${data.staffUrl}.
    `;
};
