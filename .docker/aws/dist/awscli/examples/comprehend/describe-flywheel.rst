**To describe a flywheel**

The following ``describe-flywheel`` example gets the properties of a flywheel. In this example, the model associated with the flywheel is a custom classifier model
that is trained to classify documents as either spam or nonspam, or, "ham". ::

    aws comprehend describe-flywheel \
        --flywheel-arn arn:aws:comprehend:us-west-2:111122223333:flywheel/example-flywheel

Output::

    {
        "FlywheelProperties": {
            "FlywheelArn": "arn:aws:comprehend:us-west-2:111122223333:flywheel/example-flywheel",
            "ActiveModelArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-model/version/1",
            "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role",
            "TaskConfig": {
                "LanguageCode": "en",
                "DocumentClassificationConfig": {
                    "Mode": "MULTI_CLASS",
                    "Labels": [
                        "ham",
                        "spam"
                    ]
                }
            },
            "DataLakeS3Uri": "s3://amzn-s3-demo-bucket/example-flywheel/schemaVersion=1/20230616T200543Z/",
            "DataSecurityConfig": {},
            "Status": "ACTIVE",
            "ModelType": "DOCUMENT_CLASSIFIER",
            "CreationTime": "2023-06-16T20:05:43.242000+00:00",
            "LastModifiedTime": "2023-06-16T20:21:43.567000+00:00"
        }
    }

For more information, see `Flywheel Overview <https://docs.aws.amazon.com/comprehend/latest/dg/flywheels-about.html>`__ in *Amazon Comprehend Developer Guide*.