**To list all current Rx-Norm inference jobs**

The following  example shows how ``list-rx-norm-inference-jobs`` returns a list of current asynchronous Rx-Norm batch inference jobs. ::

    aws comprehendmedical list-rx-norm-inference-jobs

Output::

    {
        "ComprehendMedicalAsyncJobPropertiesList": [
            {
                "JobId": "4980034166536cfb52gga3295a1b00a3",
                "JobStatus": "COMPLETED",
                "SubmitTime": "2020-05-19T20:38:37.594000+00:00",
                "EndTime": "2020-05-19T20:45:07.894000+00:00",
                "ExpirationTime": "2020-09-17T20:38:37+00:00",
                "InputDataConfig": {
                    "S3Bucket": "comp-med-input",
                    "S3Key": "AKIAIOSFODNN7EXAMPLE"
                },
                "OutputDataConfig": {
                    "S3Bucket": "comp-med-output",
                    "S3Key": "AKIAIOSFODNN7EXAMPLE"
                },
                "LanguageCode": "en",
                "DataAccessRoleArn": "arn:aws:iam::867139942017:role/ComprehendMedicalBatchProcessingRole",
                "ModelVersion": "0.0.0"
            }
        ]
    }

For more information, see `Ontology linking batch analysis <https://docs.aws.amazon.com/comprehend-medical/latest/dev/ontologies-batchapi.html>`__ in the *Amazon Comprehend Medical Developer Guide*.