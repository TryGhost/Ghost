**To start a dicom import job**

The following ``start-dicom-import-job`` code example starts a dicom import job. ::

    aws medical-imaging start-dicom-import-job \
        --job-name "my-job" \
        --datastore-id "12345678901234567890123456789012" \
        --input-s3-uri "s3://medical-imaging-dicom-input/dicom_input/" \
        --output-s3-uri "s3://medical-imaging-output/job_output/" \
        --data-access-role-arn "arn:aws:iam::123456789012:role/ImportJobDataAccessRole"

Output::

    {
        "datastoreId": "12345678901234567890123456789012",
        "jobId": "09876543210987654321098765432109",
        "jobStatus": "SUBMITTED",
        "submittedAt": "2022-08-12T11:28:11.152000+00:00"
    }

For more information, see `Starting an import job <https://docs.aws.amazon.com/healthimaging/latest/devguide/start-dicom-import-job.html>`__ in the *AWS HealthImaging Developer Guide*.
