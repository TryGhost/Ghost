**To list principals with access to a resource**

The following ``list-principals`` example displays a list of the principals that can access resources of the specified type through any resource shares. ::

    aws ram list-principals \
        --resource-type ec2:Subnet

Output::

    {
        "principals": [
            {
                "id": "arn:aws:organizations::123456789012:ou/o-gx7EXAMPLE/ou-29c5-zEXAMPLE",
                "resourceShareArn": "arn:aws:ram:us-west-2:123456789012:resource-share/7ab63972-b505-7e2a-420d-6f5d3EXAMPLE",
                "creationTime": 1565298209.737,
                "lastUpdatedTime": 1565298211.019,
                "external": false
            }
        ]
    }
