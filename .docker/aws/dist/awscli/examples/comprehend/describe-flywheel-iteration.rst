**To describe a flywheel iteration**

The following ``describe-flywheel-iteration`` example gets the properties of a flywheel iteration. ::

    aws comprehend describe-flywheel-iteration \
        --flywheel-arn arn:aws:comprehend:us-west-2:111122223333:flywheel/example-flywheel \
        --flywheel-iteration-id 20232222AEXAMPLE

Output:: 

    {
        "FlywheelIterationProperties": {
            "FlywheelArn": "arn:aws:comprehend:us-west-2:111122223333:flywheel/flywheel-entity",
            "FlywheelIterationId": "20232222AEXAMPLE",
            "CreationTime": "2023-06-16T21:10:26.385000+00:00",
            "EndTime": "2023-06-16T23:33:16.827000+00:00",
            "Status": "COMPLETED",
            "Message": "FULL_ITERATION: Flywheel iteration performed all functions successfully.",
            "EvaluatedModelArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-classifier/version/1",
            "EvaluatedModelMetrics": {
                "AverageF1Score": 0.7742663922375772,
                "AveragePrecision": 0.8287636394041166,
                "AverageRecall": 0.7427084833645399,
                "AverageAccuracy": 0.8795394154118689
            },
            "TrainedModelArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-classifier/version/Comprehend-Generated-v1-bb52d585",
            "TrainedModelMetrics": {
                "AverageF1Score": 0.9767700253081214,
                "AveragePrecision": 0.9767700253081214,
                "AverageRecall": 0.9767700253081214,
                "AverageAccuracy": 0.9858281665190434
            },
            "EvaluationManifestS3Prefix": "s3://amzn-s3-demo-destination-bucket/flywheel-entity/schemaVersion=1/20230616T200543Z/evaluation/20230616T211026Z/"
        }
    }

For more information, see `Flywheel overview <https://docs.aws.amazon.com/comprehend/latest/dg/flywheels-about.html>`__ in the *Amazon Comprehend Developer Guide*. 