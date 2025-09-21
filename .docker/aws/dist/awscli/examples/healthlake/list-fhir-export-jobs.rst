**To list all FHIR export jobs**

The following ``list-fhir-export-jobs`` example shows how to use the command to view a list of export jobs associated with an account. ::

    aws healthlake list-fhir-export-jobs \
        --datastore-id (Data store ID) \
        --submitted-before (DATE like 2024-10-13T19:00:00Z)\
        --submitted-after (DATE like 2020-10-13T19:00:00Z )\
        --job-name "FHIR-EXPORT" \
        --job-status SUBMITTED  \
        --max-results (Integer between 1 and 500)

Output::

    {
        "ExportJobPropertiesList": [
            {
                "ExportJobProperties": {
                    "OutputDataConfig": {
                        "S3Uri": "s3://(Bucket Name)/(Prefix Name)/",
                        "S3Configuration": {
                            "S3Uri": "s3://(Bucket Name)/(Prefix Name)/",
                            "KmsKeyId": "(KmsKey Id)"
                        }
                    },
                    "DataAccessRoleArn": "arn:aws:iam::(AWS Account ID):role/(Role Name)",
                    "JobStatus": "COMPLETED",
                    "JobId": "c145fbb27b192af392f8ce6e7838e34f",
                    "JobName": "FHIR-EXPORT",
                    "SubmitTime": "2024-11-20T11:31:46.672000-05:00",
                    "EndTime": "2024-11-20T11:34:01.636000-05:00",
                    "DatastoreId": "(Data store ID)"
                }
            }
        ]
    }

For more information, see `Exporting files from a FHIR data store <https://docs.aws.amazon.com/healthlake/latest/devguide/export-datastore.html>`__ in the AWS HealthLake Developer Guide.