**To create a launch template version**

This example creates a new launch template version based on version 1 of the launch template and specifies a different AMI ID.

Command::

  aws ec2 create-launch-template-version --launch-template-id lt-0abcd290751193123 --version-description WebVersion2 --source-version 1 --launch-template-data '{"ImageId":"ami-c998b6b2"}'

Output::

  {
    "LaunchTemplateVersion": {
        "VersionDescription": "WebVersion2", 
        "LaunchTemplateId": "lt-0abcd290751193123", 
        "LaunchTemplateName": "WebServers", 
        "VersionNumber": 2, 
        "CreatedBy": "arn:aws:iam::123456789012:root", 
        "LaunchTemplateData": {
            "ImageId": "ami-c998b6b2", 
            "InstanceType": "t2.micro", 
            "NetworkInterfaces": [
                {
                    "Ipv6Addresses": [
                        {
                            "Ipv6Address": "2001:db8:1234:1a00::123"
                        }
                    ], 
                    "DeviceIndex": 0, 
                    "SubnetId": "subnet-7b16de0c", 
                    "AssociatePublicIpAddress": true
                }
            ]
        }, 
        "DefaultVersion": false, 
        "CreateTime": "2017-12-01T13:35:46.000Z"
    }
  }