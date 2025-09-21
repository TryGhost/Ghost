**To list of all custom entity recognizers**

The following ``list-entity-recognizers`` example lists all created custom entity recognizers. ::

    aws comprehend list-entity-recognizers

Output::

    {
        "EntityRecognizerPropertiesList": [
            {
                "EntityRecognizerArn": "arn:aws:comprehend:us-west-2:111122223333:entity-recognizer/EntityRecognizer/version/1",
                "LanguageCode": "en",
                "Status": "TRAINED",
                "SubmitTime": "2023-06-14T20:44:59.631000+00:00",
                "EndTime": "2023-06-14T20:59:19.532000+00:00",
                "TrainingStartTime": "2023-06-14T20:48:52.811000+00:00",
                "TrainingEndTime": "2023-06-14T20:58:11.473000+00:00",
                "InputDataConfig": {
                    "DataFormat": "COMPREHEND_CSV",
                    "EntityTypes": [
                        {
                            "Type": "BUSINESS"
                        }
                    ],
                    "Documents": {
                        "S3Uri": "s3://amzn-s3-demo-bucket/trainingdata/dataset/",
                        "InputFormat": "ONE_DOC_PER_LINE"
                    },
                    "EntityList": {
                        "S3Uri": "s3://amzn-s3-demo-bucket/trainingdata/entity.csv"
                    }
                },
                "RecognizerMetadata": {
                    "NumberOfTrainedDocuments": 1814,
                    "NumberOfTestDocuments": 486,
                    "EvaluationMetrics": {
                        "Precision": 100.0,
                        "Recall": 100.0,
                        "F1Score": 100.0
                    },
                    "EntityTypes": [
                        {
                            "Type": "BUSINESS",
                            "EvaluationMetrics": {
                                "Precision": 100.0,
                                "Recall": 100.0,
                                "F1Score": 100.0
                            },
                            "NumberOfTrainMentions": 1520
                        }
                    ]
                },
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-servicerole",
                "VersionName": "1"
            },
            {
                "EntityRecognizerArn": "arn:aws:comprehend:us-west-2:111122223333:entity-recognizer/entityrecognizer3",
                "LanguageCode": "en",
                "Status": "TRAINED",
                "SubmitTime": "2023-06-14T22:57:51.056000+00:00",
                "EndTime": "2023-06-14T23:14:13.894000+00:00",
                "TrainingStartTime": "2023-06-14T23:01:33.984000+00:00",
                "TrainingEndTime": "2023-06-14T23:13:02.984000+00:00",
                "InputDataConfig": {
                    "DataFormat": "COMPREHEND_CSV",
                    "EntityTypes": [
                        {
                            "Type": "DEVICE"
                        }
                    ],
                    "Documents": {
                        "S3Uri": "s3://amzn-s3-demo-bucket/trainingdata/raw_txt.csv",
                        "InputFormat": "ONE_DOC_PER_LINE"
                    },
                    "EntityList": {
                        "S3Uri": "s3://amzn-s3-demo-bucket/trainingdata/entity_list.csv"
                    }
                },
                "RecognizerMetadata": {
                    "NumberOfTrainedDocuments": 4616,
                    "NumberOfTestDocuments": 3489,
                    "EvaluationMetrics": {
                        "Precision": 98.54227405247813,
                        "Recall": 100.0,
                        "F1Score": 99.26578560939794
                    },
                    "EntityTypes": [
                        {
                            "Type": "DEVICE",
                            "EvaluationMetrics": {
                                "Precision": 98.54227405247813,
                                "Recall": 100.0,
                                "F1Score": 99.26578560939794
                            },
                            "NumberOfTrainMentions": 2764
                        }
                    ]
                },
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-servicerole"
            }
        ]
    }

For more information, see `Custom entity recognition <https://docs.aws.amazon.com/comprehend/latest/dg/custom-entity-recognition.html>`__ in the *Amazon Comprehend Developer Guide*.