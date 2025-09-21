**Example 1: To retrieve list of principal permissions on the resource**

The following ``list-permissions`` example returns a list of principal permissions on the database resources. ::

    aws lakeformation list-permissions \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "CatalogId": "123456789111",
        "ResourceType": "DATABASE",
        "MaxResults": 2
    }

Output::

    {
        "PrincipalResourcePermissions": [{
            "Principal": {
                "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:user/lf-campaign-manager"
            },
            "Resource": {
                "Database": {
                    "CatalogId": "123456789111",
                    "Name": "tpc"
                }
            },
            "Permissions": [
                "DESCRIBE"
            ],
            "PermissionsWithGrantOption": []
        }],
        "NextToken": "E5SlJDSTZleUp6SWpvaU9UQTNORE0zTXpFeE5Ua3pJbjE5TENKbGVIQnBjbUYwYVc5dUlqcDdJbk5sWTI5dVpITWlPakUyTm"
    }

For more information, see `Managing Lake Formation permissions <https://docs.aws.amazon.com/lake-formation/latest/dg/managing-permissions.html>`__ in the *AWS Lake Formation Developer Guide*.

**Example 2: To retrieve list of principal permissions on the table with data filters**

The following ``list-permissions`` example list the permissions on the table with related data filters granted to the principal. ::

    aws lakeformation list-permissions \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "CatalogId": "123456789111",
        "Resource": {
            "Table": {
                "CatalogId": "123456789111",
                "DatabaseName": "tpc",
                "Name": "dl_tpc_customer"
            }
        },
        "IncludeRelated": "TRUE",
        "MaxResults": 10
    }

Output::

    {
        "PrincipalResourcePermissions": [{
                "Principal": {
                    "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:role/Admin"
                },
                "Resource": {
                    "Table": {
                        "CatalogId": "123456789111",
                        "DatabaseName": "customer",
                        "Name": "customer_invoice"
                    }
                },
                "Permissions": [
                    "ALL",
                    "ALTER",
                    "DELETE",
                    "DESCRIBE",
                    "DROP",
                    "INSERT"
                ],
                "PermissionsWithGrantOption": [
                    "ALL",
                    "ALTER",
                    "DELETE",
                    "DESCRIBE",
                    "DROP",
                    "INSERT"
                ]
            },
            {
                "Principal": {
                    "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:role/Admin"
                },
                "Resource": {
                    "TableWithColumns": {
                        "CatalogId": "123456789111",
                        "DatabaseName": "customer",
                        "Name": "customer_invoice",
                        "ColumnWildcard": {}
                    }
                },
                "Permissions": [
                    "SELECT"
                ],
                "PermissionsWithGrantOption": [
                    "SELECT"
                ]
            },
            {
                "Principal": {
                    "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:role/Admin"
                },
                "Resource": {
                    "DataCellsFilter": {
                        "TableCatalogId": "123456789111",
                        "DatabaseName": "customer",
                        "TableName": "customer_invoice",
                        "Name": "dl_us_customer"
                    }
                },
                "Permissions": [
                    "DESCRIBE",
                    "SELECT",
                    "DROP"
                ],
                "PermissionsWithGrantOption": []
            }
        ],
        "NextToken": "VyeUFjY291bnRQZXJtaXNzaW9ucyI6ZmFsc2V9"
    }

For more information, see `Managing Lake Formation permissions <https://docs.aws.amazon.com/lake-formation/latest/dg/managing-permissions.html>`__ in the *AWS Lake Formation Developer Guide*.

**Example 3: To retrieve list of principal permissions on the LF-Tags**

The following ``list-permissions`` example list the permissions on the LF-Tags granted to the principal. ::

    aws lakeformation list-permissions \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "CatalogId": "123456789111",
        "Resource": {
            "LFTag": {
                "CatalogId": "123456789111",
                "TagKey": "category",
                "TagValues": [
                    "private"
                ]
            }
        },
        "MaxResults": 10
    }

Output::

    {
        "PrincipalResourcePermissions": [{
                "Principal": {
                    "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:user/lf-admin"
                },
                "Resource": {
                    "LFTag": {
                        "CatalogId": "123456789111",
                        "TagKey": "category",
                        "TagValues": [
                            "*"
                        ]
                    }
                },
                "Permissions": [
                    "DESCRIBE"
                ],
                "PermissionsWithGrantOption": [
                    "DESCRIBE"
                ]
            },
            {
                "Principal": {
                    "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:user/lf-admin"
                },
                "Resource": {
                    "LFTag": {
                        "CatalogId": "123456789111",
                        "TagKey": "category",
                        "TagValues": [
                            "*"
                        ]
                    }
                },
                "Permissions": [
                    "ASSOCIATE"
                ],
                "PermissionsWithGrantOption": [
                    "ASSOCIATE"
                ]
            }
        ],
        "NextToken": "EJwY21GMGFXOXVJanA3SW5Ocm1pc3Npb25zIjpmYWxzZX0="
    }

For more information, see `Managing Lake Formation permissions <https://docs.aws.amazon.com/lake-formation/latest/dg/managing-permissions.html>`__ in the *AWS Lake Formation Developer Guide*.
