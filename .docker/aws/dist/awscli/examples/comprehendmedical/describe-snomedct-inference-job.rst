**To describe an SNOMED CT inference job**

The following ``describe-snomedct-inference-job`` example describes the properties of the requested inference job with the specified job-id. ::

    aws comprehendmedical describe-snomedct-inference-job \
        --job-id "2630034166536cdb52ffa3295a1b00a7"

Output::

    {
        "ComprehendMedicalAsyncJobProperties": {
            "JobId": "2630034166536cdb52ffa3295a1b00a7",
            "JobStatus": "COMPLETED",
            "SubmitTime": "2021-12-18T21:20:15.614000+00:00",
            "EndTime": "2021-12-18T21:27:07.350000+00:00",
            "ExpirationTime": "2022-05-16T21:20:15+00:00",
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
            "ModelVersion":  "0.1.0"
        }
    }

For more information, see `Ontology linking batch analysis <https://docs.aws.amazon.com/comprehend-medical/latest/dev/ontologies-batchapi.html>`__ in the *Amazon Comprehend Medical Developer Guide*.