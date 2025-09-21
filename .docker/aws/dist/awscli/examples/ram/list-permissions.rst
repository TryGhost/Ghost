**To list the available RAM managed permissions**

The following ``list-permissions`` example lists all of the RAM managed permissions available for only the AWS Glue database resource type. ::

    aws ram list-permissions \
        --resource-type glue:Database

Output::

    {
        "permissions": [
            {
                "arn": "arn:aws:ram::aws:permission/AWSRAMDefaultPermissionGlueDatabase",
                "version": "1",
                "defaultVersion": true,
                "name": "AWSRAMDefaultPermissionGlueDatabase",
                "resourceType": "glue:Database",
                "creationTime": 1592007820.935,
                "lastUpdatedTime": 1592007820.935,
                "isResourceTypeDefault": true
            },
            {
                "arn": "arn:aws:ram::aws:permission/AWSRAMPermissionGlueAllTablesReadWriteForDatabase",
                "version": "2",
                "defaultVersion": true,
                "name": "AWSRAMPermissionGlueAllTablesReadWriteForDatabase",
                "resourceType": "glue:Database",
                "creationTime": 1624912413.323,
                "lastUpdatedTime": 1624912413.323,
                "isResourceTypeDefault": false
            },
            {
                "arn": "arn:aws:ram::aws:permission/AWSRAMPermissionGlueDatabaseReadWrite",
                "version": "2",
                "defaultVersion": true,
                "name": "AWSRAMPermissionGlueDatabaseReadWrite",
                "resourceType": "glue:Database",
                "creationTime": 1624912417.4,
                "lastUpdatedTime": 1624912417.4,
                "isResourceTypeDefault": false
            },
            {
                "arn": "arn:aws:ram::aws:permission/AWSRAMPermissionGlueTableReadWriteForDatabase",
                "version": "2",
                "defaultVersion": true,
                "name": "AWSRAMPermissionGlueTableReadWriteForDatabase",
                "resourceType": "glue:Database",
                "creationTime": 1624912434.431,
                "lastUpdatedTime": 1624912434.431,
                "isResourceTypeDefault": false
            }
        ]
    }

The following ``list-permissions`` example displays the available RAM managed permissions for all resource types. ::

    aws ram list-permissions

Output::

    {
        "permissions": [
            {
                "arn": "arn:aws:ram::aws:permission/AWSRAMBlankEndEntityCertificateAPICSRPassthroughIssuanceCertificateAuthority",
                "version": "1",
                "defaultVersion": true,
                "name": "AWSRAMBlankEndEntityCertificateAPICSRPassthroughIssuanceCertificateAuthority",
                "resourceType": "acm-pca:CertificateAuthority",
                "creationTime": 1623264861.085,
                "lastUpdatedTime": 1623264861.085,
                "isResourceTypeDefault": false
            },
            {
                "arn": "arn:aws:ram::aws:permission/AWSRAMDefaultPermissionAppMesh",
                "version": "1",
                "defaultVersion": true,
                "name": "AWSRAMDefaultPermissionAppMesh",
                "resourceType": "appmesh:Mesh",
                "creationTime": 1589307188.584,
                "lastUpdatedTime": 1589307188.584,
                "isResourceTypeDefault": true
            },
            ...TRUNCATED FOR BREVITY...
            {
                "arn": "arn:aws:ram::aws:permission/AWSRAMSubordinateCACertificatePathLen0IssuanceCertificateAuthority",
                "version": "1",
                "defaultVersion": true,
                "name": "AWSRAMSubordinateCACertificatePathLen0IssuanceCertificateAuthority",
                "resourceType": "acm-pca:CertificateAuthority",
                "creationTime": 1623264876.75,
                "lastUpdatedTime": 1623264876.75,
                "isResourceTypeDefault": false
            }
        ]
    }
