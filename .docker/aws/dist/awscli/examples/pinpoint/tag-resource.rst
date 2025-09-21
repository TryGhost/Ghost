**To add tags to a resource**

The following example adds two tags (key names and values) to a resource. ::

    aws pinpoint list-tags-for-resource \
        --resource-arn arn:aws:mobiletargeting:us-east-1:AIDACKCEVSQ6C2EXAMPLE:apps/810c7aab86d42fb2b56c8c966example \
        --tags-model tags={Stack=Production,Year=2019}

This command produces no output.

For more information, see 'Tagging Amazon Pinpoint Resources <https://docs.aws.amazon.com/pinpoint/latest/developerguide/tagging-resources.html>'__ in the *Amazon Pinpoint Developer Guide*.