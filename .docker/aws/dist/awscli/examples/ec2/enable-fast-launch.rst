**To start fast launching for an image**

The following ``enable-fast-launch`` example configures the specified AMI for Fast Launch and sets the maximum number of parallel instances to launch to 6. The type of resource to use to pre-provision the AMI is set to ``snapshot``, which is also the default value. ::

    aws ec2 enable-fast-launch \
        --image-id ami-01234567890abcedf \
        --max-parallel-launches 6 \
        --resource-type snapshot

Output::

    {
        "ImageId": "ami-01234567890abcedf",
        "ResourceType": "snapshot",
        "SnapshotConfiguration": {
            "TargetResourceCount": 10
        },
        "LaunchTemplate": {},
        "MaxParallelLaunches": 6,
        "OwnerId": "0123456789123",
        "State": "enabling",
        "StateTransitionReason": "Client.UserInitiated",
        "StateTransitionTime": "2022-01-27T22:16:03.199000+00:00"
    }

For more information, see `Configure EC2 Fast Launch settings for your Windows AMI <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/win-fast-launch-configure.html>`__ in the *Amazon EC2 User Guide*.
