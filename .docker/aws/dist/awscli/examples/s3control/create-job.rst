**To create an Amazon S3 batch operations job**

The following ``create-job`` example creates an Amazon S3 batch operations job to tag objects as ``confidential` in the bucket ``employee-records``. ::

    aws s3control create-job \
        --account-id 123456789012 \
        --operation '{"S3PutObjectTagging": { "TagSet": [{"Key":"confidential", "Value":"true"}] }}' \
        --report '{"Bucket":"arn:aws:s3:::employee-records-logs","Prefix":"batch-op-create-job", "Format":"Report_CSV_20180820","Enabled":true,"ReportScope":"AllTasks"}' \
        --manifest '{"Spec":{"Format":"S3BatchOperations_CSV_20180820","Fields":["Bucket","Key"]},"Location":{"ObjectArn":"arn:aws:s3:::employee-records-logs/inv-report/7a6a9be4-072c-407e-85a2-ec3e982f773e.csv","ETag":"69f52a4e9f797e987155d9c8f5880897"}}' \
        --priority 42 \
        --role-arn arn:aws:iam::123456789012:role/S3BatchJobRole

Output::

    {
        "JobId": "93735294-df46-44d5-8638-6356f335324e"
    }
