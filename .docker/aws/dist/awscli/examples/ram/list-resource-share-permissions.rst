**To list all of the RAM managed permissions currently attached to a resource share**

The following ``list-resource-share-permissions`` example lists all of the RAM managed permissions that are attached to the specified resource share. ::

    aws ram list-resource-share-permissions \
        --resource-share-arn arn:aws:ram:us-west-2:123456789012:resource-share/27d09b4b-5e12-41d1-a4f2-19dedEXAMPLE

Output::

    {
        "permissions": [
            {
                "arn": "arn:aws:ram::aws:permission/AWSRAMDefaultPermissionLicenseConfiguration",
                "version": "1",
                "resourceType": "license-manager:LicenseConfiguration",
                "status": "ASSOCIATED",
                "lastUpdatedTime": 1632342984.234
            },
            {
                "arn": "arn:aws:ram::aws:permission/AWSRAMPermissionGlueDatabaseReadWrite",
                "version": "2",
                "resourceType": "glue:Database",
                "status": "ASSOCIATED",
                "lastUpdatedTime": 1632512462.297
            }
        ]
    }
