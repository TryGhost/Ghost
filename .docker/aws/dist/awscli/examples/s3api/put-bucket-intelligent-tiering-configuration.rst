**To update an S3 Intelligent-Tiering configuration on a bucket**

The following ``put-bucket-intelligent-tiering-configuration`` example updates an S3 Intelligent-Tiering configuration, named ExampleConfig, on a bucket. The configuration will transition objects that have not been accessed under the prefix images to Archive Access after 90 days and Deep Archive Access after 180 days. ::

    aws s3api put-bucket-intelligent-tiering-configuration \
        --bucket amzn-s3-demo-bucket \
        --id "ExampleConfig" \
        --intelligent-tiering-configuration file://intelligent-tiering-configuration.json

Contents of ``intelligent-tiering-configuration.json``::

    {
        "Id": "ExampleConfig",
        "Status": "Enabled",
        "Filter": {
            "Prefix": "images"
            },
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

This command produces no output.

For more information, see `Setting Object Ownership on an existing bucket <https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-ownership-existing-bucket.html>`__ in the *Amazon S3 User Guide*.