**To update a user's mailbox quota**

The following ``update-mailbox-quota`` command changes the specified user's mailbox quota. ::

    aws workmail update-mailbox-quota \
        --organization-id m-n1pq2345678r901st2u3vx45x6789yza \
        --user-id S-1-1-11-1111111111-2222222222-3333333333-3333 \
        --mailbox-quota 40000

This command produces no output.

For more information, see `Managing User Accounts <https://docs.aws.amazon.com/workmail/latest/adminguide/manage-users.html>`__ in the *Amazon WorkMail Administrator Guide*.
