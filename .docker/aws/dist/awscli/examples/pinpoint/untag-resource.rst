**Example 1: To remove a tag from a resource**

The following ``untag-resource`` example removes the specified tag (key name and value) from a resource. ::

    aws pinpoint untag-resource \
        --resource-arn arn:aws:mobiletargeting:us-west-2:AIDACKCEVSQ6C2EXAMPLE:apps/810c7aab86d42fb2b56c8c966example \
        --tag-keys Year

This command produces no output.

**Example 2: To remove multiple tags from a resource**

The following ``untag-resource`` example removes the specified tags (key names and values) from a resource. ::

    aws pinpoint untag-resource \
        --resource-arn arn:aws:mobiletargeting:us-east-1:AIDACKCEVSQ6C2EXAMPLE:apps/810c7aab86d42fb2b56c8c966example \
        --tag-keys Year Stack

This command produces no output.

For more information, see 'Tagging Amazon Pinpoint Resources <https://docs.aws.amazon.com/pinpoint/latest/developerguide/tagging-resources.html>'__ in the *Amazon Pinpoint Developer Guide*.
