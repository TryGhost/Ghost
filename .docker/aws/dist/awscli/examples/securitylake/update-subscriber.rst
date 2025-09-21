**To update an Amazon Security Lake subscriber.**

The following ``update-subscriber`` example updates the security lake data access sources for a specific Security Lake subscriber. ::

    aws securitylake update-subscriber \
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
                            "crawlerArn": "arn:aws:glue:eu-west-2:123456789012:crawler/E1WG1ZNPRXT0D4",
                            "databaseArn": "arn:aws:glue:eu-west-2:123456789012:database/E1WG1ZNPRXT0D4",
                            "tableArn": "arn:aws:glue:eu-west-2:123456789012:table/E1WG1ZNPRXT0D4"
                        },
                        "provider": {
                            "location": "amzn-s3-demo-bucket--usw2-az1--x-s3",
                            "roleArn": "arn:aws:iam::123456789012:role/AmazonSecurityLake-E1WG1ZNPRXT0D4"
                        },
                        "sourceName": "testCustom2"
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
            "updatedAt": "2024-07-18T20:47:37.098000+00:00"
        }
    }

For more information, see `Subscriber management <https://docs.aws.amazon.com/security-lake/latest/userguide/subscriber-management.html>`__ in the *Amazon Security Lake User Guide*.