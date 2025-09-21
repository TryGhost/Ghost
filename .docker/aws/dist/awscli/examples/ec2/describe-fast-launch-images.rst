**To describe the details for Windows AMIs that are configured for faster launching**

The following ``describe-fast-launch-images`` example describes the details for each of the AMIs in your account that are configured for faster launching, including the resource type, the snapshot configuration, the launch template details, the maximum number of parallel launches, the AMI owner ID, the state of the fast launch configuration, the reason the state was changed, and the time that the state change occurred. ::

    aws ec2 describe-fast-launch-images

Output::

    {
        "FastLaunchImages": [
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
                "State": "enabled",
                "StateTransitionReason": "Client.UserInitiated",
                "StateTransitionTime": "2022-01-27T22:20:06.552000+00:00"
            }
        ]
    }

For more information about configuring a Windows AMI for faster launching, see `Configure your AMI for faster launching <https://docs.aws.amazon.com/AWSEC2/latest/WindowsGuide/windows-ami-version-history.html#win-ami-config-fast-launch>`__ in the *Amazon EC2 User Guide*.