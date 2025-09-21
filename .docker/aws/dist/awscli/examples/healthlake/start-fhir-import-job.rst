**To start a FHIR import job**

The following ``start-fhir-import-job`` example shows how to start a FHIR import job using AWS HealthLake. ::

    aws healthlake start-fhir-import-job \
        --input-data-config S3Uri="s3://(Bucket Name)/(Prefix Name)/" \
        --job-output-data-config '{"S3Configuration": {"S3Uri":"s3://(Bucket Name)/(Prefix Name)/","KmsKeyId":"arn:aws:kms:us-east-1:012345678910:key/d330e7fc-b56c-4216-a250-f4c43ef46e83"}}' \
        --datastore-id (Data store ID) \
        --data-access-role-arn "arn:aws:iam::(AWS Account ID):role/(Role Name)"

Output::

    {
        "DatastoreId": "(Data store ID)",
        "JobStatus": "SUBMITTED",
        "JobId": "c145fbb27b192af392f8ce6e7838e34f"
    }

For more information, see `Importing files to a FHIR data store <https://docs.aws.amazon.com/healthlake/latest/devguide/import-datastore.html>`__ in the *AWS HealthLake Developer Guide*.

