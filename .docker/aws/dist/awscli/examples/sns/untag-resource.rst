**To remove a tag from a topic**

The following ``untag-resource`` example removes any tags with the specified keys from the specified Amazon SNS topic. ::

    aws sns untag-resource \
        --resource-arn arn:aws:sns:us-west-2:123456789012:MyTopic \
        --tag-keys Team

This command produces no output.
