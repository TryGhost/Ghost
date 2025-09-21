**To get a dicom import job's properties**

The following ``get-dicom-import-job`` code example gets a dicom import job's properties. ::

    aws medical-imaging get-dicom-import-job \
        --datastore-id "12345678901234567890123456789012" \
        --job-id "09876543210987654321098765432109"


Output::

    {
        "jobProperties": {
            "jobId": "09876543210987654321098765432109",
            "jobName": "my-job",
            "jobStatus": "COMPLETED",
            "datastoreId": "12345678901234567890123456789012",
            "dataAccessRoleArn": "arn:aws:iam::123456789012:role/ImportJobDataAccessRole",
            "endedAt": "2022-08-12T11:29:42.285000+00:00",
            "submittedAt": "2022-08-12T11:28:11.152000+00:00",
            "inputS3Uri": "s3://medical-imaging-dicom-input/dicom_input/",
            "outputS3Uri": "s3://medical-imaging-output/job_output/12345678901234567890123456789012-DicomImport-09876543210987654321098765432109/"
        }
    }

For more information, see `Getting import job properties <https://docs.aws.amazon.com/healthimaging/latest/devguide/get-dicom-import-job.html>`__ in the *AWS HealthImaging Developer Guide*.
