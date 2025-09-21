**To configure replication for an S3 bucket**

The following ``put-bucket-replication`` example applies a replication configuration to the specified S3 bucket. ::

    aws s3api put-bucket-replication \
        --bucket amzn-s3-demo-bucket1 \
        --replication-configuration file://replication.json

Contents of ``replication.json``::

    {
        "Role": "arn:aws:iam::123456789012:role/s3-replication-role",
        "Rules": [
            {
                "Status": "Enabled",
                "Priority": 1,
                "DeleteMarkerReplication": { "Status": "Disabled" },
                "Filter" : { "Prefix": ""},
                "Destination": {
                    "Bucket": "arn:aws:s3:::amzn-s3-demo-bucket2"
                }
            }
        ]
    }

The destination bucket must have versioning enabled. The specified role must have permission to write to the destination bucket and have a trust relationship that allows Amazon S3 to assume the role.

Example role permission policy::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:GetReplicationConfiguration",
                    "s3:ListBucket"
                ],
                "Resource": [
                    "arn:aws:s3:::amzn-s3-demo-bucket1"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "s3:GetObjectVersion",
                    "s3:GetObjectVersionAcl",
                    "s3:GetObjectVersionTagging"
                ],
                "Resource": [
                    "arn:aws:s3:::amzn-s3-demo-bucket1/*"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "s3:ReplicateObject",
                    "s3:ReplicateDelete",
                    "s3:ReplicateTags"
                ],
                "Resource": "arn:aws:s3:::amzn-s3-demo-bucket2/*"
            }
        ]
    }

Example trust relationship policy::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "s3.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }

This command produces no output.

For more information, see `This is the topic title <https://docs.aws.amazon.com/AmazonS3/latest/user-guide/enable-replication.html>`__ in the *Amazon Simple Storage Service Console User Guide*.
