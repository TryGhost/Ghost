**To update a resource share**

The following ``update-resource-share`` example changes the specified resource share to allow external principals that are not in an AWS Organization. ::

    aws ram update-resource-share \
        --allow-external-principals \
        --resource-share-arn arn:aws:ram:us-west-2:123456789012:resource-share/7ab63972-b505-7e2a-420d-6f5d3EXAMPLE

Output::

    {
        "resourceShare": {
            "resourceShareArn": "arn:aws:ram:us-west-2:123456789012:resource-share/7ab63972-b505-7e2a-420d-6f5d3EXAMPLE",
            "name": "my-resource-share",
            "owningAccountId": "123456789012",
            "allowExternalPrincipals": true,
            "status": "ACTIVE",
            "creationTime": 1565295733.282,
            "lastUpdatedTime": 1565303080.023
        }
    }
