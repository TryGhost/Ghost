**To retrieve AWS Lake Formation-managed data lake settings**

The following ``get-data-lake-settings`` example retrieves the list of data lake administrators and other data lake settings. ::

    aws lakeformation get-data-lake-settings \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {   
        "CatalogId": "123456789111"
    }

Output::

    {
        "DataLakeSettings": {
            "DataLakeAdmins": [{
                "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:user/lf-admin"
            }],
            "CreateDatabaseDefaultPermissions": [],
            "CreateTableDefaultPermissions": [
                    {
                            "Principal": {
                                "DataLakePrincipalIdentifier": "IAM_ALLOWED_PRINCIPALS"
                            },
                            "Permissions": [
                                "ALL"
                            ]
                    }
            ],
            "TrustedResourceOwners": [],
            "AllowExternalDataFiltering": true,
            "ExternalDataFilteringAllowList": [{
                "DataLakePrincipalIdentifier": "123456789111"
            }],
            "AuthorizedSessionTagValueList": [
                "Amazon EMR"
            ]
        }
    }

For more information, see `Changing the default security settings for your data lake <https://docs.aws.amazon.com/lake-formation/latest/dg/change-settings.html>`__ in the *AWS Lake Formation Developer Guide*.
