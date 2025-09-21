**To monitor an export image task**

The following ``describe-export-image-tasks`` example checks the status of the specified export image task. The resulting image file in Amazon S3 is ``my-export-bucket/exports/export-ami-1234567890abcdef0.vmdk``. ::

    aws ec2 describe-export-image-tasks \
        --export-image-task-ids export-ami-1234567890abcdef0

Output for an export image task that is in progress. ::

    {
        "ExportImageTasks": [
            {
                "ExportImageTaskId": "export-ami-1234567890abcdef0"
                "Progress": "21",
                "S3ExportLocation": {
                    "S3Bucket": "my-export-bucket",
                    "S3Prefix": "exports/"
                },
                "Status": "active",
                "StatusMessage": "updating"
            }
        ]
    }

Output for an export image task that is completed. ::

    {
        "ExportImageTasks": [
            {
                "ExportImageTaskId": "export-ami-1234567890abcdef0"
                "S3ExportLocation": {
                    "S3Bucket": "my-export-bucket",
                    "S3Prefix": "exports/"
                },
                "Status": "completed"
            }
        ]
    }

For more information, see `Export a VM from an AMI <https://docs.aws.amazon.com/vm-import/latest/userguide/vmexport_image.html>`__ in the *VM Import/Export User Guide*.
