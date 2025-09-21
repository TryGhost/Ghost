**To retrieve an S3 Intelligent-Tiering configuration on a bucket**

The following ``get-bucket-intelligent-tiering-configuration`` example retrieves an S3 Intelligent-Tiering configuration, named ExampleConfig, on a bucket. ::

    aws s3api get-bucket-intelligent-tiering-configuration \
        --bucket amzn-s3-demo-bucket \
        --id ExampleConfig

Output::

    {
        "IntelligentTieringConfiguration": {
            "Id": "ExampleConfig2",
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
        }
    }

For more information, see `Using S3 Intelligent-Tiering <https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-intelligent-tiering.html>`__ in the *Amazon S3 User Guide*.