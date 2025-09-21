**To discontinue fast launching for an image**

The following ``disable-fast-launch`` example discontinues Fast Launch for the specified AMI, and cleans up existing pre-provisioned snapshots. ::

    aws ec2 disable-fast-launch \
        --image-id ami-01234567890abcedf

Output::

    {
        "ImageId": "ami-01234567890abcedf",
        "ResourceType": "snapshot",
        "SnapshotConfiguration": {},
        "LaunchTemplate": {
            "LaunchTemplateId": "lt-01234567890abcedf",
            "LaunchTemplateName": "EC2FastLaunchDefaultResourceCreation-a8c6215d-94e6-441b-9272-dbd1f87b07e2",
            "Version": "1"
        },
        "MaxParallelLaunches": 6,
        "OwnerId": "0123456789123",
        "State": "disabling",
        "StateTransitionReason": "Client.UserInitiated",
        "StateTransitionTime": "2022-01-27T22:47:29.265000+00:00"
    }

For more information, see `Configure EC2 Fast Launch settings for your Windows AMI <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/win-fast-launch-configure.html>`__ in the *Amazon EC2 User Guide*.
