**Example 1: To create a subnet with an IPv4 CIDR block only**

The following ``create-subnet`` example creates a subnet in the specified VPC with the specified IPv4 CIDR block. ::

    aws ec2 create-subnet \
        --vpc-id vpc-081ec835f3EXAMPLE \
        --cidr-block 10.0.0.0/24 \
        --tag-specifications ResourceType=subnet,Tags=[{Key=Name,Value=my-ipv4-only-subnet}]

Output::

    {
        "Subnet": {
            "AvailabilityZone": "us-west-2a",
            "AvailabilityZoneId": "usw2-az2",
            "AvailableIpAddressCount": 251,
            "CidrBlock": "10.0.0.0/24",
            "DefaultForAz": false,
            "MapPublicIpOnLaunch": false,
            "State": "available",
            "SubnetId": "subnet-0e99b93155EXAMPLE",
            "VpcId": "vpc-081ec835f3EXAMPLE",
            "OwnerId": "123456789012",
            "AssignIpv6AddressOnCreation": false,
            "Ipv6CidrBlockAssociationSet": [],
            "Tags": [
                {
                    "Key": "Name",
                    "Value": "my-ipv4-only-subnet"
                }
            ],
            "SubnetArn": "arn:aws:ec2:us-west-2:123456789012:subnet/subnet-0e99b93155EXAMPLE"
        }
    }

**Example 2: To create a subnet with both IPv4 and IPv6 CIDR blocks**

The following ``create-subnet`` example creates a subnet in the specified VPC with the specified IPv4 and IPv6 CIDR blocks. ::

    aws ec2 create-subnet \
        --vpc-id vpc-081ec835f3EXAMPLE \
        --cidr-block 10.0.0.0/24 \
        --ipv6-cidr-block 2600:1f16:cfe:3660::/64 \
        --tag-specifications ResourceType=subnet,Tags=[{Key=Name,Value=my-ipv4-ipv6-subnet}]

Output::

    {
        "Subnet": {
            "AvailabilityZone": "us-west-2a",
            "AvailabilityZoneId": "usw2-az2",
            "AvailableIpAddressCount": 251,
            "CidrBlock": "10.0.0.0/24",
            "DefaultForAz": false,
            "MapPublicIpOnLaunch": false,
            "State": "available",
            "SubnetId": "subnet-0736441d38EXAMPLE",
            "VpcId": "vpc-081ec835f3EXAMPLE",
            "OwnerId": "123456789012",
            "AssignIpv6AddressOnCreation": false,
            "Ipv6CidrBlockAssociationSet": [
                {
                    "AssociationId": "subnet-cidr-assoc-06c5f904499fcc623",
                    "Ipv6CidrBlock": "2600:1f13:cfe:3660::/64",
                    "Ipv6CidrBlockState": {
                        "State": "associating"
                    }
                }
            ],
            "Tags": [
                {
                    "Key": "Name",
                    "Value": "my-ipv4-ipv6-subnet"
                }
            ],
            "SubnetArn": "arn:aws:ec2:us-west-2:123456789012:subnet/subnet-0736441d38EXAMPLE"
        }
    }

**Example 3: To create a subnet with an IPv6 CIDR block only**

The following ``create-subnet`` example creates a subnet in the specified VPC with the specified IPv6 CIDR block. ::

    aws ec2 create-subnet \
        --vpc-id vpc-081ec835f3EXAMPLE \
        --ipv6-native \ 
        --ipv6-cidr-block 2600:1f16:115:200::/64 \
        --tag-specifications ResourceType=subnet,Tags=[{Key=Name,Value=my-ipv6-only-subnet}]

Output::

    {
        "Subnet": {
            "AvailabilityZone": "us-west-2a",
            "AvailabilityZoneId": "usw2-az2",
            "AvailableIpAddressCount": 0,
            "DefaultForAz": false,
            "MapPublicIpOnLaunch": false,
            "State": "available",
            "SubnetId": "subnet-03f720e7deEXAMPLE",
            "VpcId": "vpc-081ec835f3EXAMPLE",
            "OwnerId": "123456789012",
            "AssignIpv6AddressOnCreation": true,
            "Ipv6CidrBlockAssociationSet": [
                {
                    "AssociationId": "subnet-cidr-assoc-01ef639edde556709",
                    "Ipv6CidrBlock": "2600:1f13:cfe:3660::/64",
                    "Ipv6CidrBlockState": {
                        "State": "associating"
                    }
                }
            ],
            "Tags": [
                {
                    "Key": "Name",
                    "Value": "my-ipv6-only-subnet"
                }
            ],
            "SubnetArn": "arn:aws:ec2:us-west-2:123456789012:subnet/subnet-03f720e7deEXAMPLE"
        }
    }

For more information, see `VPCs and subnets <https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Subnets.html>`__ in the *Amazon VPC User Guide*.