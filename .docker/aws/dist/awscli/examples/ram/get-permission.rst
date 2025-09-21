**To retrieve the details for a RAM managed permission**

The following ``get-permission`` example displays the details for the default version of the specified RAM managed permission. ::

    aws ram get-permission \
        --permission-arn arn:aws:ram::aws:permission/AWSRAMPermissionGlueTableReadWriteForDatabase

Output::

    {
        "permission": {
            "arn": "arn:aws:ram::aws:permission/AWSRAMPermissionGlueTableReadWriteForDatabase",
            "version": "2",
            "defaultVersion": true,
            "name": "AWSRAMPermissionGlueTableReadWriteForDatabase",
            "resourceType": "glue:Database",
            "permission": "{\"Effect\":\"Allow\",\"Action\":[\"glue:GetTable\", \"glue:UpdateTable\", \"glue:DeleteTable\", \"glue:BatchDeleteTable\", \"glue:BatchDeleteTableVersion\", \"glue:GetTableVersion\", \"glue:GetTableVersions\", \"glue:GetPartition\", \"glue:GetPartitions\", \"glue:BatchGetPartition\", \"glue:BatchCreatePartition\", \"glue:CreatePartition\", \"glue:UpdatePartition\", \"glue:BatchDeletePartition\", \"glue:DeletePartition\", \"glue:GetTables\", \"glue:SearchTables\"]}",
            "creationTime": 1624912434.431,
            "lastUpdatedTime": 1624912434.431,
            "isResourceTypeDefault": false
        }
    }
