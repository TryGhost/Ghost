**To bulk grant permissions on resources to the principals**

The following ``batch-grant-permissions`` example bulk grants access on specified resources to the principals. ::

    aws lakeformation batch-grant-permissions \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "CatalogId": "123456789111",
        "Entries": [{
                "Id": "1",
                "Principal": {
                    "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:user/lf-developer"
                },
                "Resource": {
                    "Table": {
                        "CatalogId": "123456789111",
                        "DatabaseName": "tpc",
                        "Name": "dl_tpc_promotion"
                    }
                },
                "Permissions": [
                    "ALL"
                ],
                "PermissionsWithGrantOption": [
                    "ALL"
                ]
            },
            {
                "Id": "2",
                "Principal": {
                    "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:user/lf-developer"
                },
                "Resource": {
                    "Table": {
                        "CatalogId": "123456789111",
                        "DatabaseName": "tpc",
                        "Name": "dl_tpc_customer"
                    }
                },
                "Permissions": [
                    "ALL"
                ],
                "PermissionsWithGrantOption": [
                    "ALL"
                ]
            },
            {
                "Id": "3",
                "Principal": {
                    "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:user/lf-business-analyst"
                },
                "Resource": {
                    "Table": {
                        "CatalogId": "123456789111",
                        "DatabaseName": "tpc",
                        "Name": "dl_tpc_promotion"
                    }
                },
                "Permissions": [
                    "ALL"
                ],
                "PermissionsWithGrantOption": [
                    "ALL"
                ]
            },
            {
                "Id": "4",
                "Principal": {
                    "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:user/lf-developer"
                },
                "Resource": {
                    "DataCellsFilter": {
                        "TableCatalogId": "123456789111",
                        "DatabaseName": "tpc",
                        "TableName": "dl_tpc_item",
                        "Name": "developer_item"
                    }
                },
                "Permissions": [
                    "SELECT"
                ],
                "PermissionsWithGrantOption": []
            }
        ]
    }

Output::

    {
        "Failures": []
    }

For more information, see `Granting and revoking permissions on Data Catalog resources <https://docs.aws.amazon.com/lake-formation/latest/dg/granting-catalog-permissions.html>`__ in the *AWS Lake Formation Developer Guide*.
