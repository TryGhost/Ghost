**To retrieve the subscription information**

The following ``get-subscriber`` example retrieves the subscription information for the specified Securiy Lake subscriber. ::

    aws securitylake get-subscriber \
        --subscriber-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "subscriber": {
            "accessTypes": [
                "LAKEFORMATION"
            ],
            "createdAt": "2024-04-19T15:19:44.421803+00:00",
            "resourceShareArn": "arn:aws:ram:eu-west-2:123456789012:resource-share/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "resourceShareName": "LakeFormation-V3-TKJGBHCKTZ-123456789012",
            "sources": [
                {
                    "awsLogSource": {
                        "sourceName": "LAMBDA_EXECUTION",
                        "sourceVersion": "1.0"
                    }
                },
                {
                    "awsLogSource": {
                        "sourceName": "EKS_AUDIT",
                        "sourceVersion": "2.0"
                    }
                },
                {
                    "awsLogSource": {
                        "sourceName": "ROUTE53",
                        "sourceVersion": "1.0"
                    }
                },
                {
                    "awsLogSource": {
                        "sourceName": "SH_FINDINGS",
                        "sourceVersion": "1.0"
                    }
                },
                {
                    "awsLogSource": {
                        "sourceName": "VPC_FLOW",
                        "sourceVersion": "1.0"
                    }
                },
                {
                    "customLogSource": {
                        "attributes": {
                            "crawlerArn": "arn:aws:glue:eu-west-2:123456789012:crawler/testCustom2",
                            "databaseArn": "arn:aws:glue:eu-west-2:123456789012:database/amazon_security_lake_glue_db_eu_west_2",
                            "tableArn": "arn:aws:glue:eu-west-2:123456789012:table/amazon_security_lake_table_eu_west_2_ext_testcustom2"
                        },
                        "provider": {
                            "location": "s3://aws-security-data-lake-eu-west-2-8ugsus4ztnsfpjbldwbgf4vge98av9/ext/testCustom2/",
                            "roleArn": "arn:aws:iam::123456789012:role/AmazonSecurityLake-Provider-testCustom2-eu-west-2"
                        },
                        "sourceName": "testCustom2"
                    }
                },
                {
                    "customLogSource": {
                        "attributes": {
                            "crawlerArn": "arn:aws:glue:eu-west-2:123456789012:crawler/TestCustom",
                            "databaseArn": "arn:aws:glue:eu-west-2:123456789012:database/amazon_security_lake_glue_db_eu_west_2",
                            "tableArn": "arn:aws:glue:eu-west-2:123456789012:table/amazon_security_lake_table_eu_west_2_ext_testcustom"
                        },
                        "provider": {
                            "location": "s3://aws-security-data-lake-eu-west-2-8ugsus4ztnsfpjbldwbgf4vge98av9/ext/TestCustom/",
                            "roleArn": "arn:aws:iam::123456789012:role/AmazonSecurityLake-Provider-TestCustom-eu-west-2"
                        },
                        "sourceName": "TestCustom"
                    }
                }
            ],
            "subscriberArn": "arn:aws:securitylake:eu-west-2:123456789012:subscriber/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "subscriberId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "subscriberIdentity": {
                "externalId": "123456789012",
                "principal": "123456789012"
            },
            "subscriberName": "test",
            "subscriberStatus": "ACTIVE",
            "updatedAt": "2024-04-19T15:19:55.230588+00:00"
        }
    }

For more information, see `Subscriber management <https://docs.aws.amazon.com/security-lake/latest/userguide/subscriber-management.html>`__ in the *Amazon Security Lake User Guide*.