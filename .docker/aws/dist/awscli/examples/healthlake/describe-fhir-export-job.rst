**To describe a FHIR export job**

The following ``describe-fhir-export-job`` example shows how to find the properties of a FHIR export job in AWS HealthLake. ::

    aws healthlake describe-fhir-export-job \
        --datastore-id (Data store ID) \
        --job-id 9b9a51943afaedd0a8c0c26c49135a31

Output::

    {
        "ExportJobProperties": {
            "DataAccessRoleArn": "arn:aws:iam::(AWS Account ID):role/(Role Name)",
            "JobStatus": "IN_PROGRESS",
            "JobId": "9009813e9d69ba7cf79bcb3468780f16",
            "SubmitTime": "2024-11-20T11:31:46.672000-05:00",
            "EndTime": "2024-11-20T11:34:01.636000-05:00",
            "OutputDataConfig": {
                "S3Configuration": {
                "S3Uri": "s3://(Bucket Name)/(Prefix Name)/",
                "KmsKeyId": "arn:aws:kms:us-east-1:012345678910:key/d330e7fc-b56c-4216-a250-f4c43ef46e83"
            }

            },
            "DatastoreId": "(Data store ID)"
        }
    }

For more information, see `Exporting files from a FHIR data store <https://docs.aws.amazon.com/healthlake/latest/devguide/export-datastore.html>`__ in the *AWS HealthLake Developer Guide*.
