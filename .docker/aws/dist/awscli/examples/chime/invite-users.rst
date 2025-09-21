**To invite users to join Amazon Chime**

The following ``invite-users`` example sends an email to invite a user to the specified Amazon Chime account. ::

    aws chime invite-users \
        --account-id a1b2c3d4-5678-90ab-cdef-11111EXAMPLE \
        --user-email-list "alejandror@example.com" "janed@example.com"

Output::

    {
        "Invites": [
            {
                "InviteId": "a1b2c3d4-5678-90ab-cdef-22222EXAMPLE",
                "Status": "Pending",
                "EmailAddress": "alejandror@example.com",
                "EmailStatus": "Sent"
            }
            {
                "InviteId": "a1b2c3d4-5678-90ab-cdef-33333EXAMPLE",
                "Status": "Pending",
                "EmailAddress": "janed@example.com",
                "EmailStatus": "Sent"
            }
        ]
    }

For more information, see `Inviting and Suspending Users <https://docs.aws.amazon.com/chime/latest/ag/manage-access.html#invite-users-team>`_ in the *Amazon Chime Administration Guide*.
