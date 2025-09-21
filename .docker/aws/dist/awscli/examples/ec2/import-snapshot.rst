**To import a snapshot**

The following ``import-snapshot`` example imports the specified disk as a snapshot. ::

    aws ec2 import-snapshot \
        --description "My server VMDK" \
        --disk-container Format=VMDK,UserBucket={'S3Bucket=my-import-bucket,S3Key=vms/my-server-vm.vmdk'}

Output::

    {
        "Description": "My server VMDK",
        "ImportTaskId": "import-snap-1234567890abcdef0",
        "SnapshotTaskDetail": {
            "Description": "My server VMDK",
            "DiskImageSize": "0.0",
            "Format": "VMDK",
            "Progress": "3",
            "Status": "active",
            "StatusMessage": "pending"
            "UserBucket": {
                "S3Bucket": "my-import-bucket",
                "S3Key": "vms/my-server-vm.vmdk"
            }
        }
    }
