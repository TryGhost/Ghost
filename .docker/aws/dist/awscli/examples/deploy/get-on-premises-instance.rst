**To get information about an on-premises instance**

The following ``get-on-premises-instance`` example retrieves information about the specified on-premises instance. ::

    aws deploy get-on-premises-instance --instance-name AssetTag12010298EX

Output::

    {
        "instanceInfo": {
        "iamUserArn": "arn:aws:iam::123456789012:user/AWS/CodeDeploy/AssetTag12010298EX",
            "tags": [
            {
                "Value": "CodeDeployDemo-OnPrem",
                "Key": "Name"
            }
            ],
            "instanceName": "AssetTag12010298EX",
            "registerTime": 1425579465.228,
            "instanceArn": "arn:aws:codedeploy:us-east-1:123456789012:instance/AssetTag12010298EX_4IwLNI2Alh"
        }
    }