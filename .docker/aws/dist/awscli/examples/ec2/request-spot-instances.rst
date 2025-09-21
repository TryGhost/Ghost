**To request Spot Instances**

This example command creates a one-time Spot Instance request for five instances in the specified Availability Zone.
If your account supports EC2-VPC only, Amazon EC2 launches the instances in the default subnet of the specified Availability Zone.
If your account supports EC2-Classic, Amazon EC2 launches the instances in EC2-Classic in the specified Availability Zone.

Command::

  aws ec2 request-spot-instances --spot-price "0.03" --instance-count 5 --type "one-time" --launch-specification file://specification.json

Specification.json::
  
  {
    "ImageId": "ami-1a2b3c4d",
    "KeyName": "my-key-pair",
    "SecurityGroupIds": [ "sg-1a2b3c4d" ],
    "InstanceType": "m3.medium",
    "Placement": {
      "AvailabilityZone": "us-west-2a"
    },
    "IamInstanceProfile": {
        "Arn": "arn:aws:iam::123456789012:instance-profile/my-iam-role"
    }
  }

Output::

  {
    "SpotInstanceRequests": [
        {
            "Status": {
                "UpdateTime": "2014-03-25T20:54:21.000Z",
                "Code": "pending-evaluation",
                "Message": "Your Spot request has been submitted for review, and is pending evaluation."
            },
            "ProductDescription": "Linux/UNIX",
            "SpotInstanceRequestId": "sir-df6f405d",
            "State": "open",
            "LaunchSpecification": {
                "Placement": {
                    "AvailabilityZone": "us-west-2a"
                },
                "ImageId": "ami-1a2b3c4d",
                "KeyName": "my-key-pair",
                "SecurityGroups": [
                    {
                        "GroupName": "my-security-group",
                        "GroupId": "sg-1a2b3c4d"
                    }
                ],
                "Monitoring": {
                    "Enabled": false
                },
                "IamInstanceProfile": {
                    "Arn": "arn:aws:iam::123456789012:instance-profile/my-iam-role"
                },
                "InstanceType": "m3.medium"
            },
            "Type": "one-time",
            "CreateTime": "2014-03-25T20:54:20.000Z",
            "SpotPrice": "0.050000"
        },
        ...
    ]
  }

This example command creates a one-time Spot Instance request for five instances in the specified subnet.
Amazon EC2 launches the instances in the specified subnet. If the VPC is a nondefault VPC, the instances
do not receive a public IP address by default.

Command::

  aws ec2 request-spot-instances --spot-price "0.050" --instance-count 5 --type "one-time" --launch-specification file://specification.json
  
Specification.json::

  {
    "ImageId": "ami-1a2b3c4d",
    "SecurityGroupIds": [ "sg-1a2b3c4d" ],
    "InstanceType": "m3.medium",
    "SubnetId": "subnet-1a2b3c4d",
    "IamInstanceProfile": {
        "Arn": "arn:aws:iam::123456789012:instance-profile/my-iam-role"
    }
  }

Output::

  {
    "SpotInstanceRequests": [
        {
            "Status": {
               "UpdateTime": "2014-03-25T22:21:58.000Z",
               "Code": "pending-evaluation",
               "Message": "Your Spot request has been submitted for review, and is pending evaluation."
            },
            "ProductDescription": "Linux/UNIX",
            "SpotInstanceRequestId": "sir-df6f405d",
            "State": "open",
            "LaunchSpecification": {
               "Placement": {
                   "AvailabilityZone": "us-west-2a"
               }
               "ImageId": "ami-1a2b3c4d"
               "SecurityGroups": [
                   {
                       "GroupName": "my-security-group",
                       "GroupID": "sg-1a2b3c4d"
                   }
               ]
               "SubnetId": "subnet-1a2b3c4d",
               "Monitoring": {
                   "Enabled": false
               },
               "IamInstanceProfile": {
                   "Arn": "arn:aws:iam::123456789012:instance-profile/my-iam-role"
               },
               "InstanceType": "m3.medium",
           },
           "Type": "one-time",
           "CreateTime": "2014-03-25T22:21:58.000Z",
           "SpotPrice": "0.050000"
        },
        ...
    ]
  }

This example assigns a public IP address to the Spot Instances that you launch in a nondefault VPC.
Note that when you specify a network interface, you must include the subnet ID and security group ID
using the network interface.

Command::

  aws ec2 request-spot-instances --spot-price "0.050" --instance-count 1 --type "one-time" --launch-specification file://specification.json

Specification.json::
  
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
        "Arn": "arn:aws:iam::123456789012:instance-profile/my-iam-role"
    }
  }
