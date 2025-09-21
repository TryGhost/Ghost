**To monitor an import image task**

The following ``describe-import-image-tasks`` example checks the status of the specified import image task. ::

    aws ec2 describe-import-image-tasks \
        --import-task-ids import-ami-1234567890abcdef0

Output for an import image task that is in progress. ::

    {
        "ImportImageTasks": [
            {
                "ImportTaskId": "import-ami-1234567890abcdef0",
                "Progress": "28",
                "SnapshotDetails": [
                    {
                        "DiskImageSize": 705638400.0,
                        "Format": "ova",
                        "Status": "completed",
                        "UserBucket": {
                            "S3Bucket": "my-import-bucket",
                            "S3Key": "vms/my-server-vm.ova"
                        }
                    }
                ],
                "Status": "active",
                "StatusMessage": "converting"
            }
        ]
    }

Output for an import image task that is completed. The ID of the resulting AMI is provided by ``ImageId``. ::

    {
        "ImportImageTasks": [
            {
                "ImportTaskId": "import-ami-1234567890abcdef0",
                "ImageId": "ami-1234567890abcdef0",
                "SnapshotDetails": [
                    {
                        "DiskImageSize": 705638400.0,
                        "Format": "ova",
                        "SnapshotId": "snap-1234567890abcdef0"
                        "Status": "completed",
                        "UserBucket": {
                            "S3Bucket": "my-import-bucket",
                            "S3Key": "vms/my-server-vm.ova"
                        }
                    }
                ],
                "Status": "completed"
            }
        ]
    }
