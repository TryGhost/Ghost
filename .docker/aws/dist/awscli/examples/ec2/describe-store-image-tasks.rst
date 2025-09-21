**To describe the progress of an AMI store task**

The following ``describe-store-image-tasks`` example describes the progress of an AMI store task. ::

    aws ec2 describe-store-image-tasks

Output::

    {
        "StoreImageTaskResults": [
            {
                "AmiId": "ami-1234567890abcdef0",
                "Bucket": "my-ami-bucket",
                "ProgressPercentage": 17,
                "S3objectKey": "ami-1234567890abcdef0.bin",
                "StoreTaskState": "InProgress",
                "StoreTaskFailureReason": null,
                "TaskStartTime": "2022-01-01T01:01:01.001Z"
            }
        ]
    }

For more information about storing and restoring an AMI using S3, see `Store and restore an AMI using S3 <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ami-store-restore.html>` in the *Amazon EC2 User Guide*.