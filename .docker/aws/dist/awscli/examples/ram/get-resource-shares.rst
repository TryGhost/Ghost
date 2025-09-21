**Example 1: To list resource shares you own and share with others**

The following ``get-resource-shares`` example lists the resource shares that created and are sharing with others. ::

    aws ram get-resource-shares \
        --resource-owner SELF

Output::

    {
        "resourceShares": [
            {
                "resourceShareArn": "arn:aws:ram:us-west-2:123456789012:resource-share/3ab63985-99d9-1cd2-7d24-75e93EXAMPLE",
                "name": "my-resource-share",
                "owningAccountId": "123456789012",
                "allowExternalPrincipals": false,
                "status": "ACTIVE",
                "tags": [
                    {
                        "key": "project",
                        "value": "lima"
                    }
                ]
                "creationTime": 1565295733.282,
                "lastUpdatedTime": 1565295733.282
            },
            {
                "resourceShareArn": "arn:aws:ram:us-west-2:123456789012:resource-share/7ab63972-b505-7e2a-420d-6f5d3EXAMPLE",
                "name": "my-resource-share",
                "owningAccountId": "123456789012",
                "allowExternalPrincipals": true,
                "status": "ACTIVE",
                "creationTime": 1565295733.282,
                "lastUpdatedTime": 1565295733.282
            }
        ]
    }

**Example 2: To list resource shares owned by others and shared with you**

The following ``get-resource-shares`` example lists the resource shares that others created and shared with you. In this example, there are none. ::

    aws ram get-resource-shares \
        --resource-owner OTHER-ACCOUNTS

Output::

    {
        "resourceShares": []
    }
