**To get information about one or more on-premises instances**

The following ``batch-get-on-premises-instances`` example gets information about two on-premises instances. ::

    aws deploy batch-get-on-premises-instances --instance-names AssetTag12010298EX AssetTag23121309EX

Output::

    {
        "instanceInfos": [
            {
                "iamUserArn": "arn:aws:iam::123456789012:user/AWS/CodeDeploy/AssetTag12010298EX",
                "tags": [
                    {
                        "Value": "CodeDeployDemo-OnPrem",
                        "Key": "Name"
                    }
                ],
                "instanceName": "AssetTag12010298EX",
                "registerTime": 1425579465.228,
                "instanceArn": "arn:aws:codedeploy:us-west-2:123456789012:instance/AssetTag12010298EX_4IwLNI2Alh"
            },
            {
                "iamUserArn": "arn:aws:iam::123456789012:user/AWS/CodeDeploy/AssetTag23121309EX",
                "tags": [
                    {
                        "Value": "CodeDeployDemo-OnPrem",
                        "Key": "Name"
                    }
                ],
                "instanceName": "AssetTag23121309EX",
                "registerTime": 1425595585.988,
                "instanceArn": "arn:aws:codedeploy:us-west-2:80398EXAMPLE:instance/AssetTag23121309EX_PomUy64Was"
            }
        ]
    }
