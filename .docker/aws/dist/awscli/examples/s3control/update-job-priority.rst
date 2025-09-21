**To update the job priority of an Amazon S3 batch operations job**

The following ``update-job-priority`` example updates the specified job to a new priority. ::

    aws s3control update-job-priority \
        --account-id 123456789012 \
        --job-id 8d9a18fe-c303-4d39-8ccc-860d372da386 \
        --priority 52

Output::

    {
        "JobId": "8d9a18fe-c303-4d39-8ccc-860d372da386",
        "Priority": 52
    }
