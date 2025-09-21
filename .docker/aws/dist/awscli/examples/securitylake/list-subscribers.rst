**To retrieve the Amazon Security Lake subscribers**

The following ``list-subscribers`` example lists all the Amazon Security Lake subscribers in a specific account. ::

    aws securitylake list-subscribers

Output::

    {
        "subscribers": [
            {
                "accessTypes": [
                    "S3"
                ],
                "createdAt": "2024-06-04T15:02:28.921000+00:00",
                "roleArn": "arn:aws:iam::123456789012:role/AmazonSecurityLake-E1WG1ZNPRXT0D4",
                "s3BucketArn": "amzn-s3-demo-bucket--usw2-az1--x-s3",
                "sources": [
                    {
                        "awsLogSource": {
                            "sourceName": "CLOUD_TRAIL_MGMT",
                            "sourceVersion": "2.0"
                        }
                    },
                    {
                        "awsLogSource": {
                            "sourceName": "LAMBDA_EXECUTION",
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
                "subscriberArn": "arn:aws:securitylake:eu-west-2:123456789012:subscriber/E1WG1ZNPRXT0D4",
                "subscriberEndpoint": "arn:aws:sqs:eu-west-2:123456789012:AmazonSecurityLake-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111-Main-Queue",
                "subscriberId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "subscriberIdentity": {
                    "externalId": "ext123456789012",
                    "principal": "123456789012"
                },
                "subscriberName": "Test",
                "subscriberStatus": "ACTIVE",
                "updatedAt": "2024-06-04T15:02:35.617000+00:00"
            }
        ]
    }

For more information, see `Subscriber management <https://docs.aws.amazon.com/security-lake/latest/userguide/subscriber-management.html>`__ in the *Amazon Security Lake User Guide*.