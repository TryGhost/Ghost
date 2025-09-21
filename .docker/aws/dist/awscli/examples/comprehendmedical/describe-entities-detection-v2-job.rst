**To describe an entities detection job**

The following ``describe-entities-detection-v2-job`` example displays the properties associated with an asynchronous entity detection job. ::

    aws comprehendmedical describe-entities-detection-v2-job \
        --job-id "ab9887877365fe70299089371c043b96"

Output::

    {
        "ComprehendMedicalAsyncJobProperties": {
            "JobId": "ab9887877365fe70299089371c043b96",
            "JobStatus": "COMPLETED",
            "SubmitTime": "2020-03-18T21:20:15.614000+00:00",
            "EndTime": "2020-03-18T21:27:07.350000+00:00",
            "ExpirationTime": "2020-07-16T21:20:15+00:00",
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
    }

For more information, see `Batch APIs <https://docs.aws.amazon.com/comprehend-medical/latest/dev/textanalysis-batchapi.html>`__ in the *Amazon Comprehend Medical Developer Guide*.