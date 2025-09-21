**To create an encrypted file system**

The following ``create-file-system`` example creates an encrypted file system using the default CMK. It also adds the tag ``Name=my-file-system``. ::

    aws efs create-file-system \
        --performance-mode generalPurpose \
        --throughput-mode bursting \
        --encrypted \
        --tags Key=Name,Value=my-file-system

Output::

    {
        "OwnerId": "123456789012",
        "CreationToken": "console-d7f56c5f-e433-41ca-8307-9d9c0example",
        "FileSystemId": "fs-c7a0456e",
        "FileSystemArn": "arn:aws:elasticfilesystem:us-west-2:123456789012:file-system/fs-48499b4d",
        "CreationTime": 1595286880.0,
        "LifeCycleState": "creating",
        "Name": "my-file-system",
        "NumberOfMountTargets": 0,
        "SizeInBytes": {
            "Value": 0,
            "ValueInIA": 0,
            "ValueInStandard": 0
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

For more information, see `Creating Amazon EFS file systems <https://docs.aws.amazon.com/efs/latest/ug/creating-using-create-fs.html>`__ in the *Amazon Elastic File System User Guide*.
