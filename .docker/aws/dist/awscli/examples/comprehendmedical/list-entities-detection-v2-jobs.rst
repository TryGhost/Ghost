**To list entities detection jobs**

The following ``list-entities-detection-v2-jobs`` example lists current asynchronous detection jobs. ::

    aws comprehendmedical list-entities-detection-v2-jobs

Output::

    {
        "ComprehendMedicalAsyncJobPropertiesList": [
            {
                "JobId": "ab9887877365fe70299089371c043b96",
                "JobStatus": "COMPLETED",
                "SubmitTime": "2020-03-19T20:38:37.594000+00:00",
                "EndTime": "2020-03-19T20:45:07.894000+00:00",
                "ExpirationTime": "2020-07-17T20:38:37+00:00",
                "InputDataConfig": {
                    "S3Bucket": "comp-med-input",
                    "S3Key": ""
                },
                "OutputDataConfig": {
                    "S3Bucket": "comp-med-output",
                    "S3Key": "867139942017-EntitiesDetection-ab9887877365fe70299089371c043b96/"
                },
                "LanguageCode": "en",
                "DataAccessRoleArn": "arn:aws:iam::867139942017:role/ComprehendMedicalBatchProcessingRole",
                "ModelVersion": "DetectEntitiesModelV20190930"
            }
        ]
    }

For more information, see `Batch APIs <https://docs.aws.amazon.com/comprehend-medical/latest/dev/textanalysis-batchapi.html>`__ in the *Amazon Comprehend Medical Developer Guide*.