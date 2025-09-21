**Example 1: To create a public NAT gateway**

The following ``create-nat-gateway`` example creates a public NAT gateway in the specified subnet and associates the Elastic IP address with the specified allocation ID. When you create a public NAT gateway, you must associate an Elastic IP address. ::

    aws ec2 create-nat-gateway \ 
        --subnet-id subnet-0250c25a1fEXAMPLE \
        --allocation-id eipalloc-09ad461b0dEXAMPLE

Output::

    {
        "NatGateway": {
            "CreateTime": "2021-12-01T22:22:38.000Z",
            "NatGatewayAddresses": [
                {
                    "AllocationId": "eipalloc-09ad461b0dEXAMPLE"
                }
            ],
            "NatGatewayId": "nat-0c61bf8a12EXAMPLE",
            "State": "pending",
            "SubnetId": "subnet-0250c25a1fEXAMPLE",
            "VpcId": "vpc-0a60eb65b4EXAMPLE",
            "ConnectivityType": "public"
        }
    }

For more information, see `NAT gateways <https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html>`__ in the *Amazon VPC User Guide*.

**Example 2: To create a private NAT gateway**

The following ``create-nat-gateway`` example creates a private NAT gateway in the specified subnet. A private NAT gateway does not have an associated Elastic IP address. ::

    aws ec2 create-nat-gateway \ 
        --subnet-id subnet-0250c25a1fEXAMPLE \
        --connectivity-type private

Output::

    {
        "NatGateway": {
            "CreateTime": "2021-12-01T22:26:00.000Z",
            "NatGatewayAddresses": [
                {}
            ],
            "NatGatewayId": "nat-011b568379EXAMPLE",
            "State": "pending",
            "SubnetId": "subnet-0250c25a1fEXAMPLE",
            "VpcId": "vpc-0a60eb65b4EXAMPLE",
            "ConnectivityType": "private"
        }
    }

For more information, see `NAT gateways <https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html>`__ in the *Amazon VPC User Guide*.
