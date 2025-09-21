**To untag a resource**

The following ``untag-resource`` example removes the specified tag from the specified Amazon WorkMail organization. ::

    aws workmail untag-resource \
        --resource-arn arn:aws:workmail:us-west-2:111122223333:organization/m-n1pq2345678r901st2u3vx45x6789yza \
        --tag-keys "priority"

This command produces no output.

For more information, see `Tagging an Organization <https://docs.aws.amazon.com/workmail/latest/adminguide/org-tag.html>`__ in the *Amazon WorkMail Administrator Guide*.
