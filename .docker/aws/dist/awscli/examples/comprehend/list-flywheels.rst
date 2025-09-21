**To list all flywheels**

The following ``list-flywheels`` example lists all created flywheels. ::

    aws comprehend list-flywheels

Output::

    {
        "FlywheelSummaryList": [
            {
                "FlywheelArn": "arn:aws:comprehend:us-west-2:111122223333:flywheel/example-flywheel-1",
                "ActiveModelArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/exampleclassifier/version/1",
                "DataLakeS3Uri": "s3://amzn-s3-demo-bucket/example-flywheel-1/schemaVersion=1/20230616T200543Z/",
                "Status": "ACTIVE",
                "ModelType": "DOCUMENT_CLASSIFIER",
                "CreationTime": "2023-06-16T20:05:43.242000+00:00",
                "LastModifiedTime": "2023-06-19T04:00:43.027000+00:00",
                "LatestFlywheelIteration": "20230619T040032Z"
            },
            {
                "FlywheelArn": "arn:aws:comprehend:us-west-2:111122223333:flywheel/example-flywheel-2",
                "ActiveModelArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/exampleclassifier2/version/1",
                "DataLakeS3Uri": "s3://amzn-s3-demo-bucket/example-flywheel-2/schemaVersion=1/20220616T200543Z/",
                "Status": "ACTIVE",
                "ModelType": "DOCUMENT_CLASSIFIER",
                "CreationTime": "2022-06-16T20:05:43.242000+00:00",
                "LastModifiedTime": "2022-06-19T04:00:43.027000+00:00",
                "LatestFlywheelIteration": "20220619T040032Z"
            }
        ]
    }

For more information, see `Flywheel overview <https://docs.aws.amazon.com/comprehend/latest/dg/flywheels-about.html>`__ in the *Amazon Comprehend Developer Guide*. 