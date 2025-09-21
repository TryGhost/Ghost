**To set AWS Lake Formation-managed data lake settings**

The following ``put-data-lake-settings`` example sets the list of data lake administrators and other data lake settings. ::

    aws lakeformation put-data-lake-settings \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "DataLakeSettings": {
            "DataLakeAdmins": [{
                    "DataLakePrincipalIdentifier": "arn:aws:iam::123456789111:user/lf-admin"
                }
            ],
            "CreateDatabaseDefaultPermissions": [],
            "CreateTableDefaultPermissions": [],
            "TrustedResourceOwners": [],
            "AllowExternalDataFiltering": true,
            "ExternalDataFilteringAllowList": [{
                "DataLakePrincipalIdentifier ": "123456789111"
            }],
            "AuthorizedSessionTagValueList": ["Amazon EMR"]
        }
    }

This command produces no output.

For more information, see `Changing the default security settings for your data lake <https://docs.aws.amazon.com/lake-formation/latest/dg/change-settings.html>`__ in the *AWS Lake Formation Developer Guide*.
