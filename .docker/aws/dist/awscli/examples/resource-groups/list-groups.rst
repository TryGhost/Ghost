**To list the available resource groups**

The following ``list-groups`` example displays a list of all of the resource groups. ::

    aws resource-groups list-groups

Output::

    {
        "GroupIdentifiers": [
            {
                "GroupName": "tbq-WebServer",
                "GroupArn": "arn:aws:resource-groups:us-west-2:123456789012:group/tbq-WebServer3"
            },
            {
                "GroupName": "cbq-CFNStackQuery",
                "GroupArn": "arn:aws:resource-groups:us-west-2:123456789012:group/cbq-CFNStackQuery"
            }
        ],
        "Groups": [
            {
                "GroupArn": "arn:aws:resource-groups:us-west-2:123456789012:group/tbq-WebServer",
                "Name": "tbq-WebServer"
            },
            {
                "GroupArn": "arn:aws:resource-groups:us-west-2:123456789012:group/cbq-CFNStackQuery",
                "Name": "cbq-CFNStackQuery"
            }
        ]
    }
