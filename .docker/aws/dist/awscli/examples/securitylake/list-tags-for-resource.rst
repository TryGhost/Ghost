**To list tags for an existing resource**

The following ``list-tags-for-resource`` example lists tags for the specified Amazon Security Lake subscriber. In this example, the Owner tag key doesn't have an associated tag value. You can use this operation to list tags for other existing Security Lake resources as well. ::

    aws securitylake list-tags-for-resource \
        --resource-arn "arn:aws:securitylake:us-east-1:123456789012:subscriber/1234abcd-12ab-34cd-56ef-1234567890ab"

Output::

    {
        "tags": [
            {
                "key": "Environment",
                "value": "Cloud"
            },
            {
                "key": "CostCenter",
                "value": "12345"
            },
            {
                "key": "Owner",
                "value": ""
            }
        ]
    }

For more information, see `Tagging Amazon Security Lake resources <https://docs.aws.amazon.com/security-lake/latest/userguide/tagging-resources.html#tags-retrieve>`__ in the *Amazon Security Lake User Guide*.
