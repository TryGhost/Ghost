**To retrieve all S3 Intelligent-Tiering configurations on a bucket**

The following ``list-bucket-intelligent-tiering-configurations`` example retrieves all S3 Intelligent-Tiering configuration on a bucket. ::

    aws s3api list-bucket-intelligent-tiering-configurations \
        --bucket amzn-s3-demo-bucket

Output::

    {
        "IsTruncated": false,
        "IntelligentTieringConfigurationList": [
            {
                "Id": "ExampleConfig",
                "Filter": {
                    "Prefix": "images"
                },
                "Status": "Enabled",
                "Tierings": [
                    {
                        "Days": 90,
                        "AccessTier": "ARCHIVE_ACCESS"
                    },
                    {
                        "Days": 180,
                        "AccessTier": "DEEP_ARCHIVE_ACCESS"
                    }
                ]
            },
            {
                "Id": "ExampleConfig2",
                "Status": "Disabled",
                "Tierings": [
                    {
                        "Days": 730,
                        "AccessTier": "ARCHIVE_ACCESS"
                    }
                ]
            },
            {
                "Id": "ExampleConfig3",
                "Filter": {
                    "Tag": {
                        "Key": "documents",
                        "Value": "taxes"
                    }
                },
                "Status": "Enabled",
                "Tierings": [
                    {
                        "Days": 90,
                        "AccessTier": "ARCHIVE_ACCESS"
                    },
                    {
                        "Days": 365,
                        "AccessTier": "DEEP_ARCHIVE_ACCESS"
                    }
                ]
            }
        ]
    }

For more information, see `Using S3 Intelligent-Tiering <https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-intelligent-tiering.html>`__ in the *Amazon S3 User Guide*.