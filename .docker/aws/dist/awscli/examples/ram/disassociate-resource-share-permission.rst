**To remove a RAM managed permission for a resource type from a resource share**

The following ``disassociate-resource-share-permission`` example removes the RAM managed permission for Glue databases from the specified resource share. ::

    aws ram disassociate-resource-share-permission \
        --resource-share-arn arn:aws:ram:us-west-2:123456789012:resource-share/27d09b4b-5e12-41d1-a4f2-19dedEXAMPLE \
        --permission-arn arn:aws:ram::aws:permission/AWSRAMPermissionGlueDatabaseReadWrite

Output::

    {
        "returnValue": true
    }
