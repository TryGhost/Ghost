**To get instance data for a launch template**

This example gets data about the specified instance and uses the ``--query`` option to return the contents in ``LaunchTemplateData``. You can use the output as a base to create a new launch template or launch template version.

Command::

  aws ec2 get-launch-template-data --instance-id i-0123d646e8048babc --query 'LaunchTemplateData'

Output::

  {
        "Monitoring": {}, 
        "ImageId": "ami-8c1be5f6", 
        "BlockDeviceMappings": [
            {
                "DeviceName": "/dev/xvda", 
                "Ebs": {
                    "DeleteOnTermination": true
                }
            }
        ], 
        "EbsOptimized": false, 
        "Placement": {
            "Tenancy": "default", 
            "GroupName": "", 
            "AvailabilityZone": "us-east-1a"
        }, 
        "InstanceType": "t2.micro", 
        "NetworkInterfaces": [
            {
                "Description": "", 
                "NetworkInterfaceId": "eni-35306abc", 
                "PrivateIpAddresses": [
                    {
                        "Primary": true, 
                        "PrivateIpAddress": "10.0.0.72"
                    }
                ], 
                "SubnetId": "subnet-7b16de0c", 
                "Groups": [
                    "sg-7c227019"
                ], 
                "Ipv6Addresses": [
                    {
                        "Ipv6Address": "2001:db8:1234:1a00::123"
                    }
                ], 
                "PrivateIpAddress": "10.0.0.72"
            }
        ]
  }