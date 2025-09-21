**To list the definitions of some or all of the tables in the specified database**

The following ``get-tables`` example returns information about the tables in the specified database. ::

        aws glue get-tables --database-name 'tempdb' 

Output::

    {
        "TableList": [
            {
                "Name": "my-s3-sink",
                "DatabaseName": "tempdb",
                "CreateTime": 1602730539.0,
                "UpdateTime": 1602730539.0,
                "Retention": 0,
                "StorageDescriptor": {
                    "Columns": [
                        {
                            "Name": "sensorid",
                            "Type": "int"
                        },
                        {
                            "Name": "currenttemperature",
                            "Type": "int"
                        },
                        {
                            "Name": "status",
                            "Type": "string"
                        }
                    ],
                    "Location": "s3://janetst-bucket-01/test-s3-output/",
                    "Compressed": false,
                    "NumberOfBuckets": 0,
                    "SerdeInfo": {
                        "SerializationLibrary": "org.openx.data.jsonserde.JsonSerDe"
                    },
                    "SortColumns": [],
                    "StoredAsSubDirectories": false
                },
                "Parameters": {
                    "classification": "json"
                },
                "CreatedBy": "arn:aws:iam::007436865787:user/JRSTERN",
                "IsRegisteredWithLakeFormation": false,
                "CatalogId": "007436865787"
            },
            {
                "Name": "s3-source",
                "DatabaseName": "tempdb",
                "CreateTime": 1602730658.0,
                "UpdateTime": 1602730658.0,
                "Retention": 0,
                "StorageDescriptor": {
                    "Columns": [
                        {
                            "Name": "sensorid",
                            "Type": "int"
                        },
                        {
                            "Name": "currenttemperature",
                            "Type": "int"
                        },
                        {
                            "Name": "status",
                            "Type": "string"
                        }
                    ],
                    "Location": "s3://janetst-bucket-01/",
                    "Compressed": false,
                    "NumberOfBuckets": 0,
                    "SortColumns": [],
                    "StoredAsSubDirectories": false
                },
                "Parameters": {
                    "classification": "json"
                },
                "CreatedBy": "arn:aws:iam::007436865787:user/JRSTERN",
                "IsRegisteredWithLakeFormation": false,
                "CatalogId": "007436865787"
            },
            {
                "Name": "test-kinesis-input",
                "DatabaseName": "tempdb",
                "CreateTime": 1601507001.0,
                "UpdateTime": 1601507001.0,
                "Retention": 0,
                "StorageDescriptor": {
                    "Columns": [
                        {
                            "Name": "sensorid",
                            "Type": "int"
                        },
                        {
                            "Name": "currenttemperature",
                            "Type": "int"
                        },
                        {
                            "Name": "status",
                            "Type": "string"
                        }
                    ],
                    "Location": "my-testing-stream",
                    "Compressed": false,
                    "NumberOfBuckets": 0,
                    "SerdeInfo": {
                        "SerializationLibrary": "org.openx.data.jsonserde.JsonSerDe"
                    },
                    "SortColumns": [],
                    "Parameters": {
                        "kinesisUrl": "https://kinesis.us-east-1.amazonaws.com",
                        "streamName": "my-testing-stream",
                        "typeOfData": "kinesis"
                    },
                    "StoredAsSubDirectories": false
                },
                "Parameters": {
                    "classification": "json"
                },
                "CreatedBy": "arn:aws:iam::007436865787:user/JRSTERN",
                "IsRegisteredWithLakeFormation": false,
                "CatalogId": "007436865787"
            }
        ]
    }

For more information, see `Defining Tables in the AWS Glue Data Catalog <https://docs.aws.amazon.com/glue/latest/dg/tables-described.html>`__ in the *AWS Glue Developer Guide*.
