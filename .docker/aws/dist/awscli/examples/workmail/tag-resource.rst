**To apply a tag to a resource**

The following ``tag-resource`` example applies a tag with key "priority" and value "1" to the specified Amazon WorkMail organization. ::

    aws workmail tag-resource \
        --resource-arn arn:aws:workmail:us-west-2:111122223333:organization/m-n1pq2345678r901st2u3vx45x6789yza \
        --tags "Key=priority,Value=1"

This command produces no output.

For more information, see `Tagging an Organization <https://docs.aws.amazon.com/workmail/latest/adminguide/org-tag.html>`__ in the *Amazon WorkMail Administrator Guide*.
