**To list all FHIR import jobs**

The following ``list-fhir-import-jobs`` example shows how to use the command to view a list of all import jobs associated with an account. ::

    aws healthlake list-fhir-import-jobs \
        --datastore-id (Data store ID) \
        --submitted-before (DATE like 2024-10-13T19:00:00Z) \
        --submitted-after (DATE like 2020-10-13T19:00:00Z ) \
        --job-name "FHIR-IMPORT" \
        --job-status SUBMITTED  \
        -max-results (Integer between 1 and 500)

Output::

    {
        "ImportJobPropertiesList": [
            {
                "JobId": "c0fddbf76f238297632d4aebdbfc9ddf",
                "JobStatus": "COMPLETED",
                "SubmitTime": "2024-11-20T10:08:46.813000-05:00",
                "EndTime": "2024-11-20T10:10:09.093000-05:00",
                "DatastoreId": "(Data store ID)",
                "InputDataConfig": {
                    "S3Uri": "s3://(Bucket Name)/(Prefix Name)/"
                },
                "JobOutputDataConfig": {
                    "S3Configuration": {
                        "S3Uri": "s3://(Bucket Name)/import/6407b9ae4c2def3cb6f1a46a0c599ec0-FHIR_IMPORT-c0fddbf76f238297632d4aebdbfc9ddf/",
                        "KmsKeyId": "arn:aws:kms:us-east-1:123456789012:key/b7f645cb-e564-4981-8672-9e012d1ff1a0"
                    }
                },
                "JobProgressReport": {
                    "TotalNumberOfScannedFiles": 1,
                    "TotalSizeOfScannedFilesInMB": 0.001798,
                    "TotalNumberOfImportedFiles": 1,
                    "TotalNumberOfResourcesScanned": 1,
                    "TotalNumberOfResourcesImported": 1,
                    "TotalNumberOfResourcesWithCustomerError": 0,
                    "TotalNumberOfFilesReadWithCustomerError": 0,
                    "Throughput": 0.0
                },
                "DataAccessRoleArn": "arn:aws:iam::(AWS Account ID):role/(Role Name)"
            }
        ]
    }


For more information, see `Importing files to FHIR data store <https://docs.aws.amazon.com/healthlake/latest/devguide/import-examples.html>`__ in the AWS HealthLake Developer Guide.