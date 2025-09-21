**To describe a mount target**

The following ``describe-mount-targets`` example describes the specified mount target. ::

    aws efs describe-mount-targets \
        --mount-target-id fsmt-f9a14450

Output::

    {
        "MountTargets": [
            {
                "OwnerId": "123456789012",
                "MountTargetId": "fsmt-f9a14450",
                "FileSystemId": "fs-c7a0456e",
                "SubnetId": "subnet-02bf4c428bexample",
                "LifeCycleState": "creating",
                "IpAddress": "10.0.1.24",
                "NetworkInterfaceId": "eni-02d542216aexample",
                "AvailabilityZoneId": "use2-az2",
                "AvailabilityZoneName": "us-east-2b",
                "VpcId": "vpc-0123456789abcdef0"
            }
        ]
    }

For more information, see `Creating mount targets <https://docs.aws.amazon.com/efs/latest/ug/accessing-fs.html>`__ in the *Amazon Elastic File System User Guide*.
