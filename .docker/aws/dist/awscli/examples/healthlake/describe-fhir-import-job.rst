**To describe a FHIR import job**

The following ``describe-fhir-import-job`` example shows how to learn the properties of a FHIR import job using AWS HealthLake. ::

    aws healthlake describe-fhir-import-job \
        --datastore-id (Data store ID) \
        --job-id c145fbb27b192af392f8ce6e7838e34f

Output::

    {
        "ImportJobProperties": {
        "InputDataConfig": {
            "S3Uri": "s3://(Bucket Name)/(Prefix Name)/"
            { "arrayitem2": 2 }
        },
        "DataAccessRoleArn": "arn:aws:iam::(AWS Account ID):role/(Role Name)",
        "JobStatus": "COMPLETED",
        "JobId": "c145fbb27b192af392f8ce6e7838e34f",
        "SubmitTime": 1606272542.161,
        "EndTime": 1606272609.497,
        "DatastoreId": "(Data store ID)"
        }
    }

For more information, see `Importing files to a FHIR data store <https://docs.aws.amazon.com/healthlake/latest/devguide/import-datastore.html>`__ in the *AWS HealthLake Developer Guide*.
