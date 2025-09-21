**To end a Session Manager session**

This ``terminate-session`` example permanently ends a session that was created by the user "Shirley-Rodriguez" and closes the data connection between the Session Manager client and SSM Agent on the instance. ::

    aws ssm terminate-session \
        --session-id "Shirley-Rodriguez-07a16060613c408b5"

Output::

    {
        "SessionId": "Shirley-Rodriguez-07a16060613c408b5"
    }

For more information, see `Terminate a Session <https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-end.html>`__ in the *AWS Systems Manager User Guide*.
