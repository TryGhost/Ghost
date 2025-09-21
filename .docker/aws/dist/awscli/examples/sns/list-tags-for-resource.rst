**To list tags for a topic**

The following ``list-tags-for-resource`` example lists the tags for the specified Amazon SNS topic. ::

    aws sns list-tags-for-resource \
        --resource-arn arn:aws:sns:us-west-2:123456789012:MyTopic

Output::

    {
        "Tags": [
            {
                "Key": "Team",
                "Value": "Alpha"
            }
        ]
    }
