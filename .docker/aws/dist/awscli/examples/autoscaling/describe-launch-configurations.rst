**Example 1: To describe the specified launch configuration**

This example describes the specified launch configuration. ::

    aws autoscaling describe-launch-configurations \
        --launch-configuration-names my-launch-config

Output::

    {
        "LaunchConfigurations": [
            {
                "LaunchConfigurationName": "my-launch-config",
                "LaunchConfigurationARN": "arn:aws:autoscaling:us-west-2:123456789012:launchConfiguration:98d3b196-4cf9-4e88-8ca1-8547c24ced8b:launchConfigurationName/my-launch-config",
                "ImageId": "ami-0528a5175983e7f28",
                "KeyName": "my-key-pair-uswest2",
                "SecurityGroups": [
                    "sg-05eaec502fcdadc2e"
                ],
                "ClassicLinkVPCSecurityGroups": [],
                "UserData": "",
                "InstanceType": "t2.micro",
                "KernelId": "",
                "RamdiskId": "",
                "BlockDeviceMappings": [
                    {
                        "DeviceName": "/dev/xvda",
                        "Ebs": {
                            "SnapshotId": "snap-06c1606ba5ca274b1",
                            "VolumeSize": 8,
                            "VolumeType": "gp2",
                            "DeleteOnTermination": true,
                            "Encrypted": false
                        }
                    }
                ],
                "InstanceMonitoring": {
                    "Enabled": true
                },
                "CreatedTime": "2020-10-28T02:39:22.321Z",
                "EbsOptimized": false,
                "AssociatePublicIpAddress": true,
                "MetadataOptions": {
                    "HttpTokens": "required",
                    "HttpPutResponseHopLimit": 1,
                    "HttpEndpoint": "disabled"
                }
            }
        ]
    }

**Example 2: To describe a specified number of launch configurations**

To return a specific number of launch configurations, use the ``--max-items`` option. ::

    aws autoscaling describe-launch-configurations \
        --max-items 1

If the output includes a ``NextToken`` field, there are more launch configurations. To get the additional launch configurations, use the value of this field with the ``--starting-token`` option in a subsequent call as follows. ::

    aws autoscaling describe-launch-configurations \
        --starting-token Z3M3LMPEXAMPLE
