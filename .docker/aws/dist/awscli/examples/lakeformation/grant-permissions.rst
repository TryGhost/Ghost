**Example 1: To grant permissions to the principal on resources using LF-Tags**

The following ``grant-permissions`` example grants  ALL permissions to the principal on database resource that matches the LF-Tag policy. ::

    aws lakeformation grant-permissions \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "CatalogId": "123456789111",
        "Principal": {
            "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:user/lf-admin"
        },
        "Resource": {
            "LFTagPolicy": {
                "CatalogId": "123456789111",
                "ResourceType": "DATABASE",
                "Expression": [{
                    "TagKey": "usergroup",
                    "TagValues": [
                        "analyst",
                        "developer"
                    ]
                }]
            }
        },
        "Permissions": [
            "ALL"
        ],
        "PermissionsWithGrantOption": [
            "ALL"
        ]
    }

This command produces no output.

For more information, see `Granting and revoking permissions on Data Catalog resources <https://docs.aws.amazon.com/lake-formation/latest/dg/granting-catalog-permissions.html>`__ in the *AWS Lake Formation Developer Guide*.

**Example 2: To grant column level permissions to the principal**

The following ``grant-permissions`` example grants permission to select specific column to the principal. ::

    aws lakeformation grant-permissions \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "CatalogId": "123456789111",
        "Principal": {
            "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:user/lf-developer"
        },
        "Resource": {
            "TableWithColumns": {
                "CatalogId": "123456789111",
                "ColumnNames": ["p_end_date_sk"],
                "DatabaseName": "tpc",
                "Name": "dl_tpc_promotion"
            }
        },
        "Permissions": [
            "SELECT"
        ],
        "PermissionsWithGrantOption": []
    }

This command produces no output.

For more information, see `Granting and revoking permissions on Data Catalog resources <https://docs.aws.amazon.com/lake-formation/latest/dg/granting-catalog-permissions.html>`__ in the *AWS Lake Formation Developer Guide*.

**Example 3: To grant table permissions to the principal**

The following ``grant-permissions`` example grants select permission on all tables of given database to the principal. ::

    aws lakeformation grant-permissions \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "CatalogId": "123456789111",
        "Principal": {
            "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:user/lf-developer"
        },
        "Resource": {
            "Table": {
                "CatalogId": "123456789111",
                "DatabaseName": "tpc",
                "TableWildcard": {}
            }
        },
        "Permissions": [
            "SELECT"
        ],
        "PermissionsWithGrantOption": []
    }

This command produces no output.

For more information, see `Granting and revoking permissions on Data Catalog resources <https://docs.aws.amazon.com/lake-formation/latest/dg/granting-catalog-permissions.html>`__ in the *AWS Lake Formation Developer Guide*.

**Example 4: To grant permissions on LF-Tags to the principal**

The following ``grant-permissions`` example grants associate permission on LF-Tags to the principal. ::

    aws lakeformation grant-permissions \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "CatalogId": "123456789111",
        "Principal": {
            "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:user/lf-developer"
        },
        "Resource": {
            "LFTag": {
                "CatalogId": "123456789111",
                "TagKey": "category",
                "TagValues": [
                    "private", "public"
                ]
            }

        },
        "Permissions": [
            "ASSOCIATE"
        ],
        "PermissionsWithGrantOption": []
    }

This command produces no output.

For more information, see `Granting and revoking permissions on Data Catalog resources <https://docs.aws.amazon.com/lake-formation/latest/dg/granting-catalog-permissions.html>`__ in the *AWS Lake Formation Developer Guide*.

**Example 5: To grant permissions on data locations to the principal**

The following ``grant-permissions`` example grants permission on data location to the principal. ::

    aws lakeformation grant-permissions \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "CatalogId": "123456789111",
        "Principal": {
            "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:user/lf-developer"
        },
        "Resource": {
            "DataLocation": {
                "CatalogId": "123456789111",
                "ResourceArn": "arn:aws:s3:::lf-data-lake-123456789111"
            }
        },
        "Permissions": [
            "DATA_LOCATION_ACCESS"
        ],
        "PermissionsWithGrantOption": []
    }

This command produces no output.

For more information, see `Granting and revoking permissions on Data Catalog resources <https://docs.aws.amazon.com/lake-formation/latest/dg/granting-catalog-permissions.html>`__ in the *AWS Lake Formation Developer Guide*.
