**To query data about one or more S3 buckets that Amazon Macie monitors and analyzes for your account**

The following ``describe-buckets`` example queries metadata for all S3 buckets whose names begin with amzn-s3-demo-bucket and are in the current AWS Region. ::

    aws macie2 describe-buckets \
        --criteria '{"bucketName":{"prefix":"amzn-s3-demo-bucket"}}'

Output::

    {
        "buckets": [
            {
                "accountId": "123456789012",
                "allowsUnencryptedObjectUploads": "FALSE",
                "automatedDiscoveryMonitoringStatus": "MONITORED",
                "bucketArn": "arn:aws:s3:::amzn-s3-demo-bucket1",
                "bucketCreatedAt": "2020-05-18T19:54:00+00:00",
                "bucketName": "amzn-s3-demo-bucket1",
                "classifiableObjectCount": 13,
                "classifiableSizeInBytes": 1592088,
                "jobDetails": {
                    "isDefinedInJob": "TRUE",
                    "isMonitoredByJob": "TRUE",
                    "lastJobId": "08c81dc4a2f3377fae45c9ddaEXAMPLE",
                    "lastJobRunTime": "2024-08-19T14:55:30.270000+00:00"
                },
                "lastAutomatedDiscoveryTime": "2024-10-22T19:11:25.364000+00:00",
                "lastUpdated": "2024-10-25T07:33:06.337000+00:00",
                "objectCount": 13,
                "objectCountByEncryptionType": {
                    "customerManaged": 0,
                    "kmsManaged": 2,
                    "s3Managed": 7,
                    "unencrypted": 4,
                    "unknown": 0
                },
                "publicAccess": {
                    "effectivePermission": "NOT_PUBLIC",
                    "permissionConfiguration": {
                        "accountLevelPermissions": {
                            "blockPublicAccess": {
                                "blockPublicAcls": true,
                                "blockPublicPolicy": true,
                                "ignorePublicAcls": true,
                                "restrictPublicBuckets": true
                            }
                        },
                        "bucketLevelPermissions": {
                            "accessControlList": {
                                "allowsPublicReadAccess": false,
                                "allowsPublicWriteAccess": false
                            },
                            "blockPublicAccess": {
                                "blockPublicAcls": true,
                                "blockPublicPolicy": true,
                                "ignorePublicAcls": true,
                                "restrictPublicBuckets": true
                            },
                            "bucketPolicy": {
                                "allowsPublicReadAccess": false,
                                "allowsPublicWriteAccess": false
                            }
                        }
                    }
                },
                "region": "us-west-2",
                "replicationDetails": {
                    "replicated": false,
                    "replicatedExternally": false,
                    "replicationAccounts": []
                },
                "sensitivityScore": 78,
                "serverSideEncryption": {
                    "kmsMasterKeyId": null,
                    "type": "NONE"
                },
                "sharedAccess": "NOT_SHARED",
                "sizeInBytes": 4549746,
                "sizeInBytesCompressed": 0,
                "tags": [
                    {
                        "key": "Division",
                        "value": "HR"
                    },
                    {
                        "key": "Team",
                        "value": "Recruiting"
                    }
                ],
                "unclassifiableObjectCount": {
                    "fileType": 0,
                    "storageClass": 0,
                    "total": 0
                },
                "unclassifiableObjectSizeInBytes": {
                    "fileType": 0,
                    "storageClass": 0,
                    "total": 0
                },
                "versioning": true
            },
            {
                "accountId": "123456789012",
                "allowsUnencryptedObjectUploads": "TRUE",
                "automatedDiscoveryMonitoringStatus": "MONITORED",
                "bucketArn": "arn:aws:s3:::amzn-s3-demo-bucket2",
                "bucketCreatedAt": "2020-11-25T18:24:38+00:00",
                "bucketName": "amzn-s3-demo-bucket2",
                "classifiableObjectCount": 8,
                "classifiableSizeInBytes": 133810,
                "jobDetails": {
                    "isDefinedInJob": "TRUE",
                    "isMonitoredByJob": "FALSE",
                    "lastJobId": "188d4f6044d621771ef7d65f2EXAMPLE",
                    "lastJobRunTime": "2024-07-09T19:37:11.511000+00:00"
                },
                "lastAutomatedDiscoveryTime": "2024-10-24T19:11:25.364000+00:00",
                "lastUpdated": "2024-10-25T07:33:06.337000+00:00",
                "objectCount": 8,
                "objectCountByEncryptionType": {
                    "customerManaged": 0,
                    "kmsManaged": 0,
                    "s3Managed": 8,
                    "unencrypted": 0,
                    "unknown": 0
                },
                "publicAccess": {
                    "effectivePermission": "NOT_PUBLIC",
                    "permissionConfiguration": {
                        "accountLevelPermissions": {
                            "blockPublicAccess": {
                                "blockPublicAcls": true,
                                "blockPublicPolicy": true,
                                "ignorePublicAcls": true,
                                "restrictPublicBuckets": true
                            }
                        },
                        "bucketLevelPermissions": {
                            "accessControlList": {
                                "allowsPublicReadAccess": false,
                                "allowsPublicWriteAccess": false
                            },
                            "blockPublicAccess": {
                                "blockPublicAcls": true,
                                "blockPublicPolicy": true,
                                "ignorePublicAcls": true,
                                "restrictPublicBuckets": true
                            },
                            "bucketPolicy": {
                                "allowsPublicReadAccess": false,
                                "allowsPublicWriteAccess": false
                            }
                        }
                    }
                },
                "region": "us-west-2",
                "replicationDetails": {
                    "replicated": false,
                    "replicatedExternally": false,
                    "replicationAccounts": []
                },
                "sensitivityScore": 95,
                "serverSideEncryption": {
                    "kmsMasterKeyId": null,
                    "type": "AES256"
                },
                "sharedAccess": "EXTERNAL",
                "sizeInBytes": 175978,
                "sizeInBytesCompressed": 0,
                "tags": [
                    {
                        "key": "Division",
                        "value": "HR"
                    },
                    {
                        "key": "Team",
                        "value": "Recruiting"
                    }
                ],
                "unclassifiableObjectCount": {
                    "fileType": 3,
                    "storageClass": 0,
                    "total": 3
                },
                "unclassifiableObjectSizeInBytes": {
                    "fileType": 2999826,
                    "storageClass": 0,
                    "total": 2999826
                },
                "versioning": true
            }
        ]
    }

For more information, see `Filtering your S3 bucket inventory <https://docs.aws.amazon.com/macie/latest/user/monitoring-s3-inventory-filter.html>`__ in the *Amazon Macie User Guide*.
