**To list resources that AWS Config has discovered**

The following command lists the EC2 instances that AWS Config has discovered::

    aws configservice list-discovered-resources --resource-type AWS::EC2::Instance

Output::

    {
        "resourceIdentifiers": [
            {
                "resourceType": "AWS::EC2::Instance",
                "resourceId": "i-1a2b3c4d"
            },
            {
                "resourceType": "AWS::EC2::Instance",
                "resourceId": "i-2a2b3c4d"
            },
            {
                "resourceType": "AWS::EC2::Instance",
                "resourceId": "i-3a2b3c4d"
            }
        ]
    }