**To bulk revoke permissions on resources from the principals**

The following ``batch-revoke-permissions`` example bulk revokes access on specified resources from the principals. ::

    aws lakeformation batch-revoke-permissions \
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
            }
        ]
    }

Output::

    {
        "Failures": []
    }

For more information, see `Granting and revoking permissions on Data Catalog resources <https://docs.aws.amazon.com/lake-formation/latest/dg/granting-catalog-permissions.html>`__ in the *AWS Lake Formation Developer Guide*.
