**Example 1: To list all resource associations for all resource types**

The following ``get-resource-share-associations`` example lists the resource associations for all resource types across all of your resource shares. ::

    aws ram get-resource-share-associations \
        --association-type RESOURCE

Output::

    {
        "resourceShareAssociations": [
            {
                "resourceShareArn": "arn:aws:ram:us-west-2:123456789012:resource-share/7ab63972-b505-7e2a-420d-6f5d3EXAMPLE",
                "associatedEntity": "arn:aws:ec2:us-west-2:123456789012:subnet/subnet-0250c25a1fEXAMPLE",
                "resourceShareName": "MySubnetShare",
                "associationType": "RESOURCE",
                "status": "ASSOCIATED",
                "creationTime": 1565303590.973,
                "lastUpdatedTime": 1565303591.695,
                "external": false
            },
            {
                "resourceShareArn": "arn:aws:ram:us-west-2:123456789012:resource-share/8167bdfe-4480-4a01-8632-315e0EXAMPLE",
                "associatedEntity": "arn:aws:license-manager:us-west-2:123456789012:license-configuration:lic-36be0485f5ae379cc74cf8e92EXAMPLE",
                "resourceShareName": "MyLicenseShare",
                "associationType": "RESOURCE",
                "status": "ASSOCIATED",
                "creationTime": 1632342958.457,
                "lastUpdatedTime": 1632342958.907,
                "external": false
            }
        ]
    }

**Example 2: To list principal associations for a resource share**

The following ``get-resource-share-associations`` example lists only the principal associations for only the specified resource share. ::

     aws ram get-resource-share-associations \
        --resource-share-arns arn:aws:ram:us-west-2:123456789012:resource-share/7be8694e-095c-41ca-9ce8-7be4aEXAMPLE \
        --association-type PRINCIPAL

Output::

    {
        "resourceShareAssociations": [
            {
                "resourceShareArn": "arn:aws:ram:us-west-2:123456789012:resource-share/7be8694e-095c-41ca-9ce8-7be4aEXAMPLE",
                "resourceShareName": "MyNewResourceShare",
                "associatedEntity": "arn:aws:organizations::123456789012:ou/o-63bEXAMPLE/ou-46xi-rEXAMPLE",
                "associationType": "PRINCIPAL",
                "status": "ASSOCIATED",
                "creationTime": 1634587042.49,
                "lastUpdatedTime": 1634587044.291,
                "external": false
            }
        ]
    }
