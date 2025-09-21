**To stop a database activity stream**

The following ``stop-activity-stream`` example stops an activity stream in an Aurora cluster named my-pg-cluster. ::

    aws rds stop-activity-stream \
        --region us-east-1 \
        --resource-arn arn:aws:rds:us-east-1:1234567890123:cluster:my-pg-cluster \
        --apply-immediately

Output::

    {
        "KmsKeyId": "arn:aws:kms:us-east-1:1234567890123:key/a12c345d-6ef7-890g-h123-456i789jk0l1",
        "KinesisStreamName": "aws-rds-das-cluster-0ABCDEFGHI1JKLM2NOPQ3R4S",
        "Status": "stopping"
    }

For more information, see `Stopping an activity stream <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/DBActivityStreams.html#DBActivityStreams.Disabling>`__ in the *Amazon Aurora User Guide*.