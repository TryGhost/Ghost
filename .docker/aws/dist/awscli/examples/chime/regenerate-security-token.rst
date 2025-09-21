**To regenerate a security token**

The following ``regenerate-security-token`` example regenerates the security token for the specified bot. ::

    aws chime regenerate-security-token \
        --account-id 12a3456b-7c89-012d-3456-78901e23fg45 \
        --bot-id 123abcd4-5ef6-789g-0h12-34j56789012k

Output::

    {
        "Bot": {
            "BotId": "123abcd4-5ef6-789g-0h12-34j56789012k",
            "UserId": "123abcd4-5ef6-789g-0h12-34j56789012k",
            "DisplayName": "myBot (Bot)",
            "BotType": "ChatBot",
            "Disabled": false,
            "CreatedTimestamp": "2019-09-09T18:05:56.749Z",
            "UpdatedTimestamp": "2019-09-09T18:05:56.749Z",
            "BotEmail": "myBot-chimebot@example.com",
            "SecurityToken": "je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY"
        }
    }


For more information, see `Authenticate Chat Bot Requests <https://docs.aws.amazon.com/chime/latest/dg/auth-bots.html>`__ in the *Amazon Chime Developer Guide*.
