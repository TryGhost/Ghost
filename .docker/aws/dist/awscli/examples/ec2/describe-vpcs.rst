**Example 1: To describe all of your VPCs**

The following ``describe-vpcs`` example retrieves details about your VPCs. ::

    aws ec2 describe-vpcs

Output::

    {
        "Vpcs": [
            {
                "CidrBlock": "30.1.0.0/16",
                "DhcpOptionsId": "dopt-19edf471",
                "State": "available",
                "VpcId": "vpc-0e9801d129EXAMPLE",
                "OwnerId": "111122223333",
                "InstanceTenancy": "default",
                "CidrBlockAssociationSet": [
                    {
                        "AssociationId": "vpc-cidr-assoc-062c64cfafEXAMPLE",
                        "CidrBlock": "30.1.0.0/16",
                        "CidrBlockState": {
                            "State": "associated"
                        }
                    }
                ],
                "IsDefault": false,
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "Not Shared"
                    }
                ]
            },
            {
                "CidrBlock": "10.0.0.0/16",
                "DhcpOptionsId": "dopt-19edf471",
                "State": "available",
                "VpcId": "vpc-06e4ab6c6cEXAMPLE",
                "OwnerId": "222222222222",
                "InstanceTenancy": "default",
                "CidrBlockAssociationSet": [
                    {
                        "AssociationId": "vpc-cidr-assoc-00b17b4eddEXAMPLE",
                        "CidrBlock": "10.0.0.0/16",
                        "CidrBlockState": {
                            "State": "associated"
                        }
                    }
                ],
                "IsDefault": false,
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "Shared VPC"
                    }
                ]
            }
        ]
    }  

**Example 2: To describe a specified VPC**

The following ``describe-vpcs`` example retrieves details for the specified VPC. ::

    aws ec2 describe-vpcs \
        --vpc-ids vpc-06e4ab6c6cEXAMPLE

Output::

    {
        "Vpcs": [
            {
                "CidrBlock": "10.0.0.0/16",
                "DhcpOptionsId": "dopt-19edf471",
                "State": "available",
                "VpcId": "vpc-06e4ab6c6cEXAMPLE",
                "OwnerId": "111122223333",
                "InstanceTenancy": "default",
                "CidrBlockAssociationSet": [
                    {
                        "AssociationId": "vpc-cidr-assoc-00b17b4eddEXAMPLE",
                        "CidrBlock": "10.0.0.0/16",
                        "CidrBlockState": {
                            "State": "associated"
                        }
                    }
                ],
                "IsDefault": false,
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "Shared VPC"
                    }
                ]
            }
        ]
    }
