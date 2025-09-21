**To launch a Scheduled Instance**

This example launches the specified Scheduled Instance in a VPC.

Command::

  aws ec2 run-scheduled-instances --scheduled-instance-id sci-1234-1234-1234-1234-123456789012 --instance-count 1 --launch-specification file://launch-specification.json

Launch-specification.json::

  {
    "ImageId": "ami-12345678",
    "KeyName": "my-key-pair",
    "InstanceType": "c4.large",
    "NetworkInterfaces": [
      {
          "DeviceIndex": 0,
          "SubnetId": "subnet-12345678",
          "AssociatePublicIpAddress": true,
          "Groups": ["sg-12345678"]
      }
    ],
    "IamInstanceProfile": {
        "Name": "my-iam-role"
    }
  }

Output::

  {
    "InstanceIdSet": [
        "i-1234567890abcdef0"
    ]
  }

This example launches the specified Scheduled Instance in EC2-Classic.

Command::

  aws ec2 run-scheduled-instances --scheduled-instance-id sci-1234-1234-1234-1234-123456789012 --instance-count 1 --launch-specification file://launch-specification.json

Launch-specification.json::

  {
    "ImageId": "ami-12345678",
    "KeyName": "my-key-pair",
    "SecurityGroupIds": ["sg-12345678"],
    "InstanceType": "c4.large",
    "Placement": {
      "AvailabilityZone": "us-west-2b"
    }
    "IamInstanceProfile": {
        "Name": "my-iam-role"
    }
  }

Output::

  {
    "InstanceIdSet": [
        "i-1234567890abcdef0"
    ]
  }
