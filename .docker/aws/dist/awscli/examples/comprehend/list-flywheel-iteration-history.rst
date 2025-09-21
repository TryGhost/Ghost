**To list all flywheel iteration history**

The following ``list-flywheel-iteration-history`` example lists all iterations of a flywheel. ::

    aws comprehend list-flywheel-iteration-history
        --flywheel-arn arn:aws:comprehend:us-west-2:111122223333:flywheel/example-flywheel

Output::

    {
        "FlywheelIterationPropertiesList": [
            {
                "FlywheelArn": "arn:aws:comprehend:us-west-2:111122223333:flywheel/example-flywheel",
                "FlywheelIterationId": "20230619TEXAMPLE",
                "CreationTime": "2023-06-19T04:00:32.594000+00:00",
                "EndTime": "2023-06-19T04:00:49.248000+00:00",
                "Status": "COMPLETED",
                "Message": "FULL_ITERATION: Flywheel iteration performed all functions successfully.",
                "EvaluatedModelArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-classifier/version/1",
                "EvaluatedModelMetrics": {
                    "AverageF1Score": 0.7742663922375772,
                    "AverageF1Score": 0.9876464664646313,
                    "AveragePrecision": 0.9800000253081214,
                    "AverageRecall": 0.9445600253081214,
                    "AverageAccuracy": 0.9997281665190434
                },
                "EvaluationManifestS3Prefix": "s3://amzn-s3-demo-bucket/example-flywheel/schemaVersion=1/20230619TEXAMPLE/evaluation/20230619TEXAMPLE/"
            },
            {
                "FlywheelArn": "arn:aws:comprehend:us-west-2:111122223333:flywheel/example-flywheel-2",
                "FlywheelIterationId": "20230616TEXAMPLE",
                "CreationTime": "2023-06-16T21:10:26.385000+00:00",
                "EndTime": "2023-06-16T23:33:16.827000+00:00",
                "Status": "COMPLETED",
                "Message": "FULL_ITERATION: Flywheel iteration performed all functions successfully.",
                "EvaluatedModelArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/spamvshamclassify/version/1",
                "EvaluatedModelMetrics": {
                    "AverageF1Score": 0.7742663922375772,
                    "AverageF1Score": 0.9767700253081214,
                    "AveragePrecision": 0.9767700253081214,
                    "AverageRecall": 0.9767700253081214,
                    "AverageAccuracy": 0.9858281665190434
                },
                "EvaluationManifestS3Prefix": "s3://amzn-s3-demo-bucket/example-flywheel-2/schemaVersion=1/20230616TEXAMPLE/evaluation/20230616TEXAMPLE/"
            }
        ]
    }

For more information, see `Flywheel overview <https://docs.aws.amazon.com/comprehend/latest/dg/flywheels-about.html>`__ in the *Amazon Comprehend Developer Guide*. 