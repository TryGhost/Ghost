**Example 1: To associate a resource with a resource share**

The following ``associate-resource-share`` example adds a license configuration to the specified resource share. ::

    aws ram associate-resource-share \
        --resource-share arn:aws:ram:us-west-2:123456789012:resource-share/27d09b4b-5e12-41d1-a4f2-19dedEXAMPLE \
        --resource-arns arn:aws:license-manager:us-west-2:123456789012:license-configuration:lic-36be0485f5ae379cc74cf8e92EXAMPLE

Output::

    {
        "resourceShareAssociations": [
            {
               "resourceShareArn": "arn:aws:ram:us-west-2:123456789012:resource-share/27d09b4b-5e12-41d1-a4f2-19dedEXAMPLE",
               "associatedEntity": "arn:aws:license-manager:us-west-2:123456789012:license-configuration:lic-36be0485f5ae379cc74cf8e92EXAMPLE",
               "associationType": "RESOURCE",
               "status": "ASSOCIATING",
               "external": false
            }
        ]
    }

**Example 2: To associate a principal with a resource share**

The following ``associate-resource-share`` example grants access for the specified resource share to all accounts in the specified organizational unit. ::

    aws ram associate-resource-share \
        --resource-share-arn arn:aws:ram:us-west-2:123456789012:resource-share/27d09b4b-5e12-41d1-a4f2-19dedEXAMPLE \
        --principals arn:aws:organizations::123456789012:ou/o-63bEXAMPLE/ou-46xi-rEXAMPLE

Output::

    {
        "resourceShareAssociations": [
            {
                "status": "ASSOCIATING",
                "associationType": "PRINCIPAL",
                "associatedEntity": "arn:aws:organizations::123456789012:ou/o-63bEXAMPLE/ou-46xi-rEXAMPLE",
                "external": false,
                "resourceShareArn": "arn:aws:ram:us-west-2:123456789012:resource-share/27d09b4b-5e12-41d1-a4f2-19dedEXAMPLE"
            }
        ]
    }