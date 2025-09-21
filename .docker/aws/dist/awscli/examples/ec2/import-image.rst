**To import a VM image file as an AMI**

The following ``import-image`` example imports the specified OVA. ::

  aws ec2 import-image \
    --disk-containers Format=ova,UserBucket="{S3Bucket=my-import-bucket,S3Key=vms/my-server-vm.ova}"

Output::

    {
        "ImportTaskId": "import-ami-1234567890abcdef0",
        "Progress": "2",
        "SnapshotDetails": [
            {
                "DiskImageSize": 0.0,
                "Format": "ova",
                "UserBucket": {
                    "S3Bucket": "my-import-bucket",
                    "S3Key": "vms/my-server-vm.ova"
                }
            }
        ],
        "Status": "active",
        "StatusMessage": "pending"
    }
