**To retrieve the document for a job**

The following ``get-job-document`` example displays details about the document for the job whose ID is ``example-job-01``. ::

    aws iot get-job-document \
        --job-id "example-job-01"
        
Output::

    {
        "document": "\n{\n    \"operation\":\"customJob\",\n    \"otherInfo\":\"someValue\"\n}\n"
    }

For more information, see `Creating and Managing Jobs (CLI) <https://docs.aws.amazon.com/iot/latest/developerguide/manage-job-cli.html>`__ in the *AWS IoT Developer Guide*.
