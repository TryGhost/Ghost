**To list the definitions of some or all of the databases in the AWS Glue Data Catalog**

The following ``get-databases`` example returns information about the databases in the Data Catalog. ::

    aws glue get-databases

Output::

    {
        "DatabaseList": [
            {
                "Name": "default",
                "Description": "Default Hive database",
                "LocationUri": "file:/spark-warehouse",
                "CreateTime": 1602084052.0,
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
                "CatalogId": "111122223333"
            },
            {
                "Name": "flights-db",
                "CreateTime": 1587072847.0,
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
                "CatalogId": "111122223333"
            },
            {
                "Name": "legislators",
                "CreateTime": 1601415625.0,
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
                "CatalogId": "111122223333"
            },
            {
                "Name": "tempdb",
                "CreateTime": 1601498566.0,
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
                "CatalogId": "111122223333"
            }
        ]
    }

For more information, see `Defining a Database in Your Data Catalog <https://docs.aws.amazon.com/glue/latest/dg/define-database.html>`__ in the *AWS Glue Developer Guide*.
