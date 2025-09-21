**To describe an RxNorm inference job**

The following ``describe-rx-norm-inference-job`` example describes the properties of the requested inference job with the specified job-id. ::

    aws comprehendmedical describe-rx-norm-inference-job \
        --job-id "eg8199877365fc70299089371c043b96"

Output::

    {
        "ComprehendMedicalAsyncJobProperties": {
            "JobId": "g8199877365fc70299089371c043b96",
            "JobStatus": "COMPLETED",
            "SubmitTime": "2020-05-18T21:20:15.614000+00:00",
            "EndTime": "2020-05-18T21:27:07.350000+00:00",
            "ExpirationTime": "2020-09-16T21:20:15+00:00",
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
    }

For more information, see `Ontology linking batch analysis <https://docs.aws.amazon.com/comprehend-medical/latest/dev/ontologies-batchapi.html>`__ in the *Amazon Comprehend Medical Developer Guide*.