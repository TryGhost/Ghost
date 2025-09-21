**To update user settings**

The following ``update-user-settings`` example enables the specified user to make inbound and outbound calls and send and receive SMS messages. ::

    aws chime update-user-settings \
        --account-id 12a3456b-7c89-012d-3456-78901e23fg45 \
        --user-id 1ab2345c-67de-8901-f23g-45h678901j2k \
        --user-settings "Telephony={InboundCalling=true,OutboundCalling=true,SMS=true}"

This command produces no output.

For more information, see `Managing User Phone Numbers <https://docs.aws.amazon.com/chime/latest/ag/user-phone.html>`__ in the *Amazon Chime Administration Guide*.
