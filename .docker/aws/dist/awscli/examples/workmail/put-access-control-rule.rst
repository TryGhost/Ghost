**To put a new access control rule**

The following ``put-access-control-rule`` example denies the specified user access to the specified Amazon WorkMail organization. ::

    aws workmail put-access-control-rule \
        --name "myRule" \
        --effect "DENY" \
        --description "my rule" \
        --user-ids "S-1-1-11-1111111111-2222222222-3333333333-3333" \
        --organization-id m-n1pq2345678r901st2u3vx45x6789yza

This command produces no output.

For more information, see `Working with Access Control Rules <https://docs.aws.amazon.com/workmail/latest/adminguide/access-rules.html>`__ in the *Amazon WorkMail Administrator Guide*.
