**To update the status of an Amazon S3 batch operations job**

The following ``update-job-status`` example cancels the specified job which is awaiting approval. ::

    aws s3control update-job-status \
        --account-id 123456789012 \
        --job-id 8d9a18fe-c303-4d39-8ccc-860d372da386 \
        --requested-job-status Cancelled

Output::

    {
        "Status": "Cancelled",
        "JobId": "8d9a18fe-c303-4d39-8ccc-860d372da386"
    }

The following ``update-job-status`` example confirms and runs the specified which is awaiting approval. ::

    aws s3control update-job-status \
        --account-id 123456789012 \
        --job-id 5782949f-3301-4fb3-be34-8d5bab54dbca \
        --requested-job-status Ready

    Output::

    {
        "Status": "Ready",
        "JobId": "5782949f-3301-4fb3-be34-8d5bab54dbca"
    }

The following ``update-job-status`` example cancels the specified job which is running. ::

     aws s3control update-job-status \
        --account-id 123456789012 \
        --job-id 5782949f-3301-4fb3-be34-8d5bab54dbca \
        --requested-job-status Cancelled

    Output::
    {
             "Status": "Cancelling",
             "JobId": "5782949f-3301-4fb3-be34-8d5bab54dbca"
    }
