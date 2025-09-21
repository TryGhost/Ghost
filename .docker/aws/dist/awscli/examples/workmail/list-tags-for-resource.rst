**To list the tags for a resource**

The following ``list-tags-for-resource`` example lists the tags for the specified Amazon WorkMail organization. ::

    aws workmail list-tags-for-resource \
        --resource-arn arn:aws:workmail:us-west-2:111122223333:organization/m-n1pq2345678r901st2u3vx45x6789yza

Output::

    {
        "Tags": [
            {
                "Key": "priority",
                "Value": "1"
            }
        ]
    }

For more information, see `Tagging an Organization <https://docs.aws.amazon.com/workmail/latest/adminguide/org-tag.html>`__ in the *Amazon WorkMail Administrator Guide*.
