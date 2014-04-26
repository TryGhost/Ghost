var when     = require("when"),
    config   = require('../config'),
    mail;
    
    
// ## Mail
mail = {

    // #### Send
    // **takes:** a json object representing an email.
    send: function (postData) {
        var mailer = require('../mail'),
            message = {
                to: postData.to,
                subject: postData.subject,
                html: postData.html
            };
        
        // **returns:** a promise from the mailer with the number of successfully sent emails
        return mailer.send(message)
            .then(function (data) {
                return when.resolve({ code: 200, message: data.message });
            })
            .otherwise(function (error) {
                return when.reject({ code: 500, message: error.message });
            });
    },
    
    // #### SendTest
    // **takes:** nothing
    sendTest: function () {
        // **returns:** a promise
        return mail.send({
            subject: 'Test Ghost Email',
            html: '<p><strong>Hello there!</strong></p>' +
                '<p>Excellent! You\'ve successfully setup your email config for your Ghost blog over on ' + config().url + '</p>' +
                '<p>If you hadn\'t, you wouldn\'t be reading this email, but you are, so it looks like all is well :)</p>' +
                '<p>xoxo</p>' +
                '<p>Team Ghost<br>' +
                '<a href="https://ghost.org">https://ghost.org</a></p>'
        });
    }
};
module.exports = mail;