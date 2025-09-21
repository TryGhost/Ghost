**To list of all document classifiers**

The following ``list-document-classifiers`` example lists all trained and in-training document classifier models. ::

    aws comprehend list-document-classifiers

Output::

    {
        "DocumentClassifierPropertiesList": [
            {
                "DocumentClassifierArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/exampleclassifier1",
                "LanguageCode": "en",
                "Status": "TRAINED",
                "SubmitTime": "2023-06-13T19:04:15.735000+00:00",
                "EndTime": "2023-06-13T19:42:31.752000+00:00",
                "TrainingStartTime": "2023-06-13T19:08:20.114000+00:00",
                "TrainingEndTime": "2023-06-13T19:41:35.080000+00:00",
                "InputDataConfig": {
                    "DataFormat": "COMPREHEND_CSV",
                    "S3Uri": "s3://amzn-s3-demo-bucket/trainingdata"
                },
                "OutputDataConfig": {},
                "ClassifierMetadata": {
                    "NumberOfLabels": 3,
                    "NumberOfTrainedDocuments": 5016,
                    "NumberOfTestDocuments": 557,
                    "EvaluationMetrics": {
                        "Accuracy": 0.9856,
                        "Precision": 0.9919,
                        "Recall": 0.9459,
                        "F1Score": 0.9673,
                        "MicroPrecision": 0.9856,
                        "MicroRecall": 0.9856,
                        "MicroF1Score": 0.9856,
                        "HammingLoss": 0.0144
                    }
                },
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-testorle",
                "Mode": "MULTI_CLASS"
            },
            {
                "DocumentClassifierArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/exampleclassifier2",
                "LanguageCode": "en",
                "Status": "TRAINING",
                "SubmitTime": "2023-06-13T21:20:28.690000+00:00",
                "InputDataConfig": {
                    "DataFormat": "COMPREHEND_CSV",
                    "S3Uri": "s3://amzn-s3-demo-bucket/trainingdata"
                },
                "OutputDataConfig": {},
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-testorle",
                "Mode": "MULTI_CLASS"
            }
        ]
    }

For more information, see `Creating and managing custom models <https://docs.aws.amazon.com/comprehend/latest/dg/manage-models.html>`__ in the *Amazon Comprehend Developer Guide*.