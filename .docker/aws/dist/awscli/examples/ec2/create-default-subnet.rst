**To create a default subnet**

This example creates a default subnet in Availability Zone ``us-east-2a``.

Command::

  aws ec2 create-default-subnet --availability-zone us-east-2a

 {
    "Subnet": {
        "AvailabilityZone": "us-east-2a", 
        "Tags": [], 
        "AvailableIpAddressCount": 4091, 
        "DefaultForAz": true, 
        "Ipv6CidrBlockAssociationSet": [], 
        "VpcId": "vpc-1a2b3c4d", 
        "State": "available", 
        "MapPublicIpOnLaunch": true, 
        "SubnetId": "subnet-1122aabb", 
        "CidrBlock": "172.31.32.0/20", 
        "AssignIpv6AddressOnCreation": false
    }
  }