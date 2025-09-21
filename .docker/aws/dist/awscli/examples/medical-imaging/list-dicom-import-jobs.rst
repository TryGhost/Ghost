**To list dicom import jobs**

The following ``list-dicom-import-jobs`` code example lists dicom import jobs. ::

    aws medical-imaging list-dicom-import-jobs \
        --datastore-id "12345678901234567890123456789012"

Output::

    {
        "jobSummaries": [
            {
                "jobId": "09876543210987654321098765432109",
                "jobName": "my-job",
                "jobStatus": "COMPLETED",
                "datastoreId": "12345678901234567890123456789012",
                "dataAccessRoleArn": "arn:aws:iam::123456789012:role/ImportJobDataAccessRole",
                "endedAt": "2022-08-12T11:21:56.504000+00:00",
                "submittedAt": "2022-08-12T11:20:21.734000+00:00"
            }
        ]
    }

For more information, see `Listing import jobs <https://docs.aws.amazon.com/healthimaging/latest/devguide/list-dicom-import-jobs.html>`__ in the *AWS HealthImaging Developer Guide*.
