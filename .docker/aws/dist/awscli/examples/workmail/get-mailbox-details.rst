**To get a user's mailbox details**

The following ``get-mailbox-details`` command retrieves details about the specified user's mailbox. ::

    aws workmail get-mailbox-details \
        --organization-id m-n1pq2345678r901st2u3vx45x6789yza \
        --user-id S-1-1-11-1111111111-2222222222-3333333333-3333

Output::

    {
        "MailboxQuota": 51200,
        "MailboxSize": 0.03890800476074219
    }

For more information, see `Managing User Accounts <https://docs.aws.amazon.com/workmail/latest/adminguide/manage-users.html>`__ in the *Amazon WorkMail Administrator Guide*.
