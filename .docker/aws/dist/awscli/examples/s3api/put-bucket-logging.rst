**Example 1: To set bucket policy logging**

The following ``put-bucket-logging`` example sets the logging policy for *amzn-s3-demo-bucket*. First, grant the logging service principal permission in your bucket policy using the ``put-bucket-policy`` command. ::

    aws s3api put-bucket-policy \
        --bucket amzn-s3-demo-bucket \
        --policy file://policy.json

Contents of ``policy.json``::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "S3ServerAccessLogsPolicy",
                "Effect": "Allow",
                "Principal": {"Service": "logging.s3.amazonaws.com"},
                "Action": "s3:PutObject",
                "Resource": "arn:aws:s3:::amzn-s3-demo-bucket/Logs/*",
                "Condition": {
                    "ArnLike": {"aws:SourceARN": "arn:aws:s3:::SOURCE-BUCKET-NAME"},
                    "StringEquals": {"aws:SourceAccount": "SOURCE-AWS-ACCOUNT-ID"}
                }
            }
        ]
    }

To apply the logging policy, use ``put-bucket-logging``. ::

    aws s3api put-bucket-logging \
        --bucket amzn-s3-demo-bucket \
        --bucket-logging-status file://logging.json

Contents of ``logging.json``::

   {
        "LoggingEnabled": {
            "TargetBucket": "amzn-s3-demo-bucket",
            "TargetPrefix": "Logs/"
        }
    }

.. Note:: The ``put-bucket-policy`` command is required to grant ``s3:PutObject`` permissions to the logging service principal.

For more information, see `Amazon S3 Server Access Logging <https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html>`__ in the *Amazon S3 User Guide*.

**Example 2: To set a bucket policy for logging access to only a single user**

The following ``put-bucket-logging`` example sets the logging policy for *amzn-s3-demo-bucket*. The AWS user *bob@example.com* will have full control over
the log files, and no one else has any access. First, grant S3 permission with ``put-bucket-acl``. ::

    aws s3api put-bucket-acl \
        --bucket amzn-s3-demo-bucket \
        --grant-write URI=http://acs.amazonaws.com/groups/s3/LogDelivery \
        --grant-read-acp URI=http://acs.amazonaws.com/groups/s3/LogDelivery

Then apply the logging policy using ``put-bucket-logging``. ::

    aws s3api put-bucket-logging \
        --bucket amzn-s3-demo-bucket \
        --bucket-logging-status file://logging.json

Contents of ``logging.json``::

    {
        "LoggingEnabled": {
            "TargetBucket": "amzn-s3-demo-bucket",
            "TargetPrefix": "amzn-s3-demo-bucket-logs/",
            "TargetGrants": [
                {
                    "Grantee": {
                        "Type": "AmazonCustomerByEmail",
                        "EmailAddress": "bob@example.com"
                    },
                    "Permission": "FULL_CONTROL"
                }
            ]
        }
    }

.. Note:: the ``put-bucket-acl`` command is required to grant S3's log delivery system the necessary permissions (write and read-acp permissions).

For more information, see `Amazon S3 Server Access Logging <https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html>`__ in the *Amazon S3 Developer Guide*.