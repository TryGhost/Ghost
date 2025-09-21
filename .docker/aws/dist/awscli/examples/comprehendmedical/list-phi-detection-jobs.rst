**To list protected health information (PHI) detection jobs**

The following ``list-phi-detection-jobs`` example lists current protected health information (PHI) detection jobs ::

    aws comprehendmedical list-phi-detection-jobs

Output::

    {
        "ComprehendMedicalAsyncJobPropertiesList": [
            {
                "JobId": "4750034166536cdb52ffa3295a1b00a3",
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
                    "S3Key": "867139942017-PHIDetection-4750034166536cdb52ffa3295a1b00a3/"
                },
                "LanguageCode": "en",
                "DataAccessRoleArn": "arn:aws:iam::867139942017:role/ComprehendMedicalBatchProcessingRole",
                "ModelVersion": "PHIModelV20190903"
            }
        ]
    }

For more information, see `Batch APIs <https://docs.aws.amazon.com/comprehend-medical/latest/dev/textanalysis-batchapi.html>`__ in the *Amazon Comprehend Medical Developer Guide*.