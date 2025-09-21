**To start a database activity stream**

The following ``start-activity-stream`` example starts an asynchronous activity stream to monitor an Aurora cluster named my-pg-cluster. ::

    aws rds start-activity-stream \
        --region us-east-1 \
        --mode async \
        --kms-key-id arn:aws:kms:us-east-1:1234567890123:key/a12c345d-6ef7-890g-h123-456i789jk0l1 \
        --resource-arn arn:aws:rds:us-east-1:1234567890123:cluster:my-pg-cluster \
        --apply-immediately

Output::

    {
        "KmsKeyId": "arn:aws:kms:us-east-1:1234567890123:key/a12c345d-6ef7-890g-h123-456i789jk0l1",
        "KinesisStreamName": "aws-rds-das-cluster-0ABCDEFGHI1JKLM2NOPQ3R4S",
        "Status": "starting",
        "Mode": "async",
        "ApplyImmediately": true
    }

For more information, see `Starting a database activity stream <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/DBActivityStreams.html#DBActivityStreams.Enabling>`__ in the *Amazon Aurora User Guide*.