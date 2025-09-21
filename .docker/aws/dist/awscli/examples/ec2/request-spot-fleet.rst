**To request a Spot fleet in the subnet with the lowest price**

This example command creates a Spot fleet request with two launch specifications that differ only by subnet.
The Spot fleet launches the instances in the specified subnet with the lowest price.
If the instances are launched in a default VPC, they receive a public IP address by default.
If the instances are launched in a nondefault VPC, they do not receive a public IP address by default. 

Note that you can't specify different subnets from the same Availability Zone in a Spot fleet request.

Command::

  aws ec2 request-spot-fleet --spot-fleet-request-config file://config.json

Config.json:: 
  
  {
    "SpotPrice": "0.04",
    "TargetCapacity": 2,
    "IamFleetRole": "arn:aws:iam::123456789012:role/my-spot-fleet-role",
    "LaunchSpecifications": [
        {
            "ImageId": "ami-1a2b3c4d",
            "KeyName": "my-key-pair",
            "SecurityGroups": [
                {
                    "GroupId": "sg-1a2b3c4d"
                }
            ],
            "InstanceType": "m3.medium",
            "SubnetId": "subnet-1a2b3c4d, subnet-3c4d5e6f",
            "IamInstanceProfile": {
                "Arn": "arn:aws:iam::123456789012:instance-profile/my-iam-role"
            }
        }
    ]
  }

Output::

  {
    "SpotFleetRequestId": "sfr-73fbd2ce-aa30-494c-8788-1cee4EXAMPLE"
  }


**To request a Spot fleet in the Availability Zone with the lowest price**

This example command creates a Spot fleet request with two launch specifications that differ only by Availability Zone.
The Spot fleet launches the instances in the specified Availability Zone with the lowest price.
If your account supports EC2-VPC only, Amazon EC2 launches the Spot instances in the default subnet of the Availability Zone. 
If your account supports EC2-Classic, Amazon EC2 launches the instances in EC2-Classic in the Availability Zone. 

Command::

  aws ec2 request-spot-fleet --spot-fleet-request-config file://config.json
  
Config.json:: 

  {
    "SpotPrice": "0.04", 
    "TargetCapacity": 2,
    "IamFleetRole": "arn:aws:iam::123456789012:role/my-spot-fleet-role",
    "LaunchSpecifications": [
        {
            "ImageId": "ami-1a2b3c4d",
            "KeyName": "my-key-pair",
            "SecurityGroups": [
                {
                    "GroupId": "sg-1a2b3c4d"
                }
            ],
            "InstanceType": "m3.medium",
            "Placement": {
                "AvailabilityZone": "us-west-2a, us-west-2b"
            },
            "IamInstanceProfile": {
                "Arn": "arn:aws:iam::123456789012:instance-profile/my-iam-role"
            }
        }
    ]
  }

**To launch Spot instances in a subnet and assign them public IP addresses**

This example command assigns public addresses to instances launched in a nondefault VPC. 
Note that when you specify a network interface, you must include the subnet ID and security group ID
using the network interface.

Command::

  aws ec2 request-spot-fleet --spot-fleet-request-config file://config.json
  
Config.json:: 

  {
    "SpotPrice": "0.04", 
    "TargetCapacity": 2,
    "IamFleetRole": "arn:aws:iam::123456789012:role/my-spot-fleet-role",
    "LaunchSpecifications": [
        {
            "ImageId": "ami-1a2b3c4d",
            "KeyName": "my-key-pair",
            "InstanceType": "m3.medium",
            "NetworkInterfaces": [
                {
                    "DeviceIndex": 0,
                    "SubnetId": "subnet-1a2b3c4d",
                    "Groups": [ "sg-1a2b3c4d" ],
                    "AssociatePublicIpAddress": true
                }
            ],
            "IamInstanceProfile": {
                "Arn": "arn:aws:iam::880185128111:instance-profile/my-iam-role"
            }
        }
    ]
  }

**To request a Spot fleet using the diversified allocation strategy**

This example command creates a Spot fleet request that launches 30 instances using the diversified allocation strategy.
The launch specifications differ by instance type. The Spot fleet distributes the instances
across the launch specifications such that there are 10 instances of each type.

Command::

  aws ec2 request-spot-fleet --spot-fleet-request-config file://config.json
  
Config.json:: 

  {
    "SpotPrice": "0.70", 
    "TargetCapacity": 30,
    "AllocationStrategy": "diversified",
    "IamFleetRole": "arn:aws:iam::123456789012:role/my-spot-fleet-role",
    "LaunchSpecifications": [
        {
            "ImageId": "ami-1a2b3c4d",
            "InstanceType": "c4.2xlarge",
            "SubnetId": "subnet-1a2b3c4d"
        },
        {
            "ImageId": "ami-1a2b3c4d",
            "InstanceType": "m3.2xlarge",
            "SubnetId": "subnet-1a2b3c4d"
        },
        {
            "ImageId": "ami-1a2b3c4d",
            "InstanceType": "r3.2xlarge",
            "SubnetId": "subnet-1a2b3c4d"
        }
    ]
  }

For more information, see `Spot Fleet Requests`_ in the *Amazon Elastic Compute Cloud User Guide*.

.. _`Spot Fleet Requests`: http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-fleet-requests.html

