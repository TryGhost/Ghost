**Example 1: To describe a public NAT gateway**

The following ``describe-nat-gateways`` example describes the specified public NAT gateway. ::

    aws ec2 describe-nat-gateways \
        --nat-gateway-id nat-01234567890abcdef

Output::

    {
        "NatGateways": [
            {
                "CreateTime": "2023-08-25T01:56:51.000Z",
                "NatGatewayAddresses": [
                    {
                        "AllocationId": "eipalloc-0790180cd2EXAMPLE",
                        "NetworkInterfaceId": "eni-09cc4b2558794f7f9",
                        "PrivateIp": "10.0.0.211",
                        "PublicIp": "54.85.121.213",
                        "AssociationId": "eipassoc-04d295cc9b8815b24",
                        "IsPrimary": true,
                        "Status": "succeeded"
                    },
                    {
                        "AllocationId": "eipalloc-0be6ecac95EXAMPLE",
                        "NetworkInterfaceId": "eni-09cc4b2558794f7f9",
                        "PrivateIp": "10.0.0.74",
                        "PublicIp": "3.211.231.218",
                        "AssociationId": "eipassoc-0f96bdca17EXAMPLE",
                        "IsPrimary": false,
                        "Status": "succeeded"
                    }
                ],
                "NatGatewayId": "nat-01234567890abcdef",
                "State": "available",
                "SubnetId": "subnet-655eab5f08EXAMPLE",
                "VpcId": "vpc-098eb5ef58EXAMPLE",
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "public-nat"
                    }
                ],
                "ConnectivityType": "public"
            }
        ]
    }

**Example 2: To describe a private NAT gateway**

The following ``describe-nat-gateways`` example describes the specified private NAT gateway. ::

    aws ec2 describe-nat-gateways \
        --nat-gateway-id nat-1234567890abcdef0

Output::

    {
        "NatGateways": [
            {
                "CreateTime": "2023-08-25T00:50:05.000Z",
                "NatGatewayAddresses": [
                    {
                        "NetworkInterfaceId": "eni-0065a61b324d1897a",
                        "PrivateIp": "10.0.20.240",
                        "IsPrimary": true,
                        "Status": "succeeded"
                    },
                    {
                        "NetworkInterfaceId": "eni-0065a61b324d1897a",
                        "PrivateIp": "10.0.20.33",
                        "IsPrimary": false,
                        "Status": "succeeded"
                    },
                    {
                        "NetworkInterfaceId": "eni-0065a61b324d1897a",
                        "PrivateIp": "10.0.20.197",
                        "IsPrimary": false,
                        "Status": "succeeded"
                    }
                ],
                "NatGatewayId": "nat-1234567890abcdef0",
                "State": "available",
                "SubnetId": "subnet-08fc749671EXAMPLE",
                "VpcId": "vpc-098eb5ef58EXAMPLE",
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "private-nat"
                    }
                ],
                "ConnectivityType": "private"
            }
        ]
    }

For more information, see `NAT gateways <https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html>`__ in the *Amazon VPC User Guide*.
