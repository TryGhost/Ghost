**To describe launch template versions**

This example describes the versions of the specified launch template.

Command::

  aws ec2 describe-launch-template-versions --launch-template-id lt-068f72b72934aff71

Output::

  {
    "LaunchTemplateVersions": [
        {
            "LaunchTemplateId": "lt-068f72b72934aff71", 
            "LaunchTemplateName": "Webservers", 
            "VersionNumber": 3, 
            "CreatedBy": "arn:aws:iam::123456789102:root", 
            "LaunchTemplateData": {
                "KeyName": "kp-us-east", 
                "ImageId": "ami-6057e21a", 
                "InstanceType": "t2.small", 
                "NetworkInterfaces": [
                    {
                        "SubnetId": "subnet-7b16de0c", 
                        "DeviceIndex": 0, 
                        "Groups": [
                            "sg-7c227019"
                        ]
                    }
                ]
            }, 
            "DefaultVersion": false, 
            "CreateTime": "2017-11-20T13:19:54.000Z"
        }, 
        {
            "LaunchTemplateId": "lt-068f72b72934aff71", 
            "LaunchTemplateName": "Webservers", 
            "VersionNumber": 2, 
            "CreatedBy": "arn:aws:iam::123456789102:root", 
            "LaunchTemplateData": {
                "KeyName": "kp-us-east", 
                "ImageId": "ami-6057e21a", 
                "InstanceType": "t2.medium", 
                "NetworkInterfaces": [
                    {
                        "SubnetId": "subnet-1a2b3c4d", 
                        "DeviceIndex": 0, 
                        "Groups": [
                            "sg-7c227019"
                        ]
                    }
                ]
            }, 
            "DefaultVersion": false, 
            "CreateTime": "2017-11-20T13:12:32.000Z"
        }, 
        {
            "LaunchTemplateId": "lt-068f72b72934aff71", 
            "LaunchTemplateName": "Webservers", 
            "VersionNumber": 1, 
            "CreatedBy": "arn:aws:iam::123456789102:root", 
            "LaunchTemplateData": {
                "UserData": "", 
                "KeyName": "kp-us-east", 
                "ImageId": "ami-aabbcc11", 
                "InstanceType": "t2.medium", 
                "NetworkInterfaces": [
                    {
                        "SubnetId": "subnet-7b16de0c", 
                        "DeviceIndex": 0, 
                        "DeleteOnTermination": false, 
                        "Groups": [
                            "sg-7c227019"
                        ], 
                        "AssociatePublicIpAddress": true
                    }
                ]
            }, 
            "DefaultVersion": true, 
            "CreateTime": "2017-11-20T12:52:33.000Z"
        }
    ]
  }