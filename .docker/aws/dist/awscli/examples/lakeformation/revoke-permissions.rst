**To revoke permissions on resources from the principal**

The following ``revoke-permissions`` example revoke principal access to specific table of a given database. ::

    aws lakeformation revoke-permissions \
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
                "Name": "dl_tpc_promotion"
            }
        },
        "Permissions": [
            "ALL"
        ],
        "PermissionsWithGrantOption": []
    }

This command produces no output.

For more information, see `Granting and revoking permissions on Data Catalog resources <https://docs.aws.amazon.com/lake-formation/latest/dg/granting-catalog-permissions.html>`__ in the *AWS Lake Formation Developer Guide*.
