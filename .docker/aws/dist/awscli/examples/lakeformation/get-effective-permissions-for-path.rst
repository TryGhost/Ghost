**To retrieve permissions on resources located at specific path**

The following ``get-effective-permissions-for-path`` example returns the Lake Formation permissions for a specified table or database resource located at a path in Amazon S3. ::

    aws lakeformation get-effective-permissions-for-path \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "CatalogId": "123456789111",
        "ResourceArn": "arn:aws:s3:::lf-data-lake-123456789111"
    }

Output::

    {
        "Permissions": [{
                "Principal": {
                    "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:user/lf-campaign-manager"
                },
                "Resource": {
                    "Database": {
                        "Name": "tpc"
                    }
                },
                "Permissions": [
                    "DESCRIBE"
                ],
                "PermissionsWithGrantOption": []
            },
            {
                "Principal": {
                    "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:role/EMR-RuntimeRole"
                },
                "Resource": {
                    "Database": {
                        "Name": "tpc"
                    }
                },
                "Permissions": [
                    "ALL"
                ],
                "PermissionsWithGrantOption": []
            },
            {
                "Principal": {
                    "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:saml-provider/oktaSAMLProvider:user/emr-developer"
                },
                "Resource": {
                    "Database": {
                        "Name": "tpc"
                    }
                },
                "Permissions": [
                    "ALL",
                    "DESCRIBE"
                ],
                "PermissionsWithGrantOption": []
            },
            {
                "Principal": {
                    "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:user/lf-admin"
                },
                "Resource": {
                    "Database": {
                        "Name": "tpc"
                    }
                },
                "Permissions": [
                    "ALL",
                    "ALTER",
                    "CREATE_TABLE",
                    "DESCRIBE",
                    "DROP"
                ],
                "PermissionsWithGrantOption": [
                    "ALL",
                    "ALTER",
                    "CREATE_TABLE",
                    "DESCRIBE",
                    "DROP"
                ]
            },
            {
                "Principal": {
                    "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:role/LF-GlueServiceRole"
                },
                "Resource": {
                    "Database": {
                        "Name": "tpc"
                    }
                },
                "Permissions": [
                    "CREATE_TABLE"
                ],
                "PermissionsWithGrantOption": []
            }
        ],
        "NextToken": "E5SlJDSTZleUp6SWpvaU9UQTNORE0zTXpFeE5Ua3pJbjE5TENKbGVIQnBjbUYwYVc5dUlqcDdJbk5sWTI5dVpITWlPakUyTm=="
    }

For more information, see `Managing Lake Formation permissions <https://docs.aws.amazon.com/lake-formation/latest/dg/managing-permissions.html>`__ in the *AWS Lake Formation Developer Guide*.
