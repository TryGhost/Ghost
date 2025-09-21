**Example 1: To describe all your subnets**

The following ``describe-subnets`` example displays the details of your subnets. ::

    aws ec2 describe-subnets

Output::

    {
        "Subnets": [
            {
                "AvailabilityZone": "us-east-1d",
                "AvailabilityZoneId": "use1-az2",
                "AvailableIpAddressCount": 4089,
                "CidrBlock": "172.31.80.0/20",
                "DefaultForAz": true,
                "MapPublicIpOnLaunch": false,
                "MapCustomerOwnedIpOnLaunch": true,
                "State": "available",
                "SubnetId": "subnet-0bb1c79de3EXAMPLE",
                "VpcId": "vpc-0ee975135dEXAMPLE",
                "OwnerId": "111122223333",
                "AssignIpv6AddressOnCreation": false,
                "Ipv6CidrBlockAssociationSet": [],
                "CustomerOwnedIpv4Pool:": 'pool-2EXAMPLE',    
                "SubnetArn": "arn:aws:ec2:us-east-2:111122223333:subnet/subnet-0bb1c79de3EXAMPLE",
                "EnableDns64": false,
                "Ipv6Native": false,
                "PrivateDnsNameOptionsOnLaunch": {
                    "HostnameType": "ip-name",
                    "EnableResourceNameDnsARecord": false,
                    "EnableResourceNameDnsAAAARecord": false
                }
            },
            {
                "AvailabilityZone": "us-east-1d",
                "AvailabilityZoneId": "use1-az2",
                "AvailableIpAddressCount": 4089,
                "CidrBlock": "172.31.80.0/20",
                "DefaultForAz": true,
                "MapPublicIpOnLaunch": true,
                "MapCustomerOwnedIpOnLaunch": false,
                "State": "available",
                "SubnetId": "subnet-8EXAMPLE",
                "VpcId": "vpc-3EXAMPLE",
                "OwnerId": "1111222233333",
                "AssignIpv6AddressOnCreation": false,
                "Ipv6CidrBlockAssociationSet": [],        
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "MySubnet"
                    }
                ],
                "SubnetArn": "arn:aws:ec2:us-east-1:111122223333:subnet/subnet-8EXAMPLE",
                "EnableDns64": false,
                "Ipv6Native": false,
                "PrivateDnsNameOptionsOnLaunch": {
                    "HostnameType": "ip-name",
                    "EnableResourceNameDnsARecord": false,
                    "EnableResourceNameDnsAAAARecord": false
                }
            }
        ]
    }

For more information, see `Working with VPCs and Subnets <https://docs.aws.amazon.com/vpc/latest/userguide/working-with-vpcs.html>`__ in the *AWS VPC User Guide*.

**Example 2: To describe the subnets of a specific VPC**

The following ``describe-subnets`` example uses a filter to retrieve details for the subnets of the specified VPC. ::

    aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=vpc-3EXAMPLE"

Output::

    {
        "Subnets": [
            {
                "AvailabilityZone": "us-east-1d",
                "AvailabilityZoneId": "use1-az2",
                "AvailableIpAddressCount": 4089,
                "CidrBlock": "172.31.80.0/20",
                "DefaultForAz": true,
                "MapPublicIpOnLaunch": true,
                "MapCustomerOwnedIpOnLaunch": false,
                "State": "available",
                "SubnetId": "subnet-8EXAMPLE",
                "VpcId": "vpc-3EXAMPLE",
                "OwnerId": "1111222233333",
                "AssignIpv6AddressOnCreation": false,
                "Ipv6CidrBlockAssociationSet": [],
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "MySubnet"
                    }
                ],
                "SubnetArn": "arn:aws:ec2:us-east-1:111122223333:subnet/subnet-8EXAMPLE",
                "EnableDns64": false,
                "Ipv6Native": false,
                "PrivateDnsNameOptionsOnLaunch": {
                    "HostnameType": "ip-name",
                    "EnableResourceNameDnsARecord": false,
                    "EnableResourceNameDnsAAAARecord": false
                }
            }
        ]
    }

For more information, see `Working with VPCs and Subnets <https://docs.aws.amazon.com/vpc/latest/userguide/working-with-vpcs.html>`__ in the *AWS VPC User Guide*.

**Example 3: To describe the subnets with a specific tag**

The following ``describe-subnets`` example uses a filter to retrieve the details of those subnets with the tag ``CostCenter=123`` and the ``--query`` parameter to display the subnet IDs of the subnets with this tag. ::

    aws ec2 describe-subnets \
        --filters "Name=tag:CostCenter,Values=123" \
        --query "Subnets[*].SubnetId" \
        --output text

Output::

    subnet-0987a87c8b37348ef
    subnet-02a95061c45f372ee
    subnet-03f720e7de2788d73

For more information, see `Working with VPCs and Subnets <https://docs.aws.amazon.com/vpc/latest/userguide/working-with-vpcs.html>`__ in the *Amazon VPC User Guide*.