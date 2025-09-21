**To describe a file system**

The following ``describe-file-systems`` example describes the specified file system. ::

    aws efs describe-file-systems \
        --file-system-id fs-c7a0456e

Output::

    {
        "FileSystems": [
            {
                "OwnerId": "123456789012",
                "CreationToken": "console-d7f56c5f-e433-41ca-8307-9d9c0example",
                "FileSystemId": "fs-c7a0456e",
                "FileSystemArn": "arn:aws:elasticfilesystem:us-west-2:123456789012:file-system/fs-48499b4d",
                "CreationTime": 1595286880.0,
                "LifeCycleState": "available",
                "Name": "my-file-system",
                "NumberOfMountTargets": 3,
                "SizeInBytes": {
                    "Value": 6144,
                    "Timestamp": 1600991437.0,
                    "ValueInIA": 0,
                    "ValueInStandard": 6144
                },
                "PerformanceMode": "generalPurpose",
                "Encrypted": true,
                "KmsKeyId": "arn:aws:kms:us-west-2:123456789012:key/a59b3472-e62c-42e4-adcf-30d92example",
                "ThroughputMode": "bursting",
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "my-file-system"
                    }
                ]
            }
        ]
    }

For more information, see `Managing Amazon EFS file systems <https://docs.aws.amazon.com/efs/latest/ug/managing.html>`__ in the *Amazon Elastic File System User Guide*.
