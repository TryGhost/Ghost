**To disassociate an Elastic IP address from a public NAT gateway**

The following ``disassociate-nat-gateway-address`` example disassociates the specified Elastic IP address from the specified public NAT gateway. ::

    aws ec2 disassociate-nat-gateway-address \
        --nat-gateway-id nat-1234567890abcdef0 \
        --association-ids eipassoc-0f96bdca17EXAMPLE

Output::

    {
        "NatGatewayId": "nat-1234567890abcdef0",
        "NatGatewayAddresses": [
            {
                "AllocationId": "eipalloc-0be6ecac95EXAMPLE",
                "NetworkInterfaceId": "eni-09cc4b2558794f7f9",
                "PrivateIp": "10.0.0.74",
                "PublicIp": "3.211.231.218",
                "AssociationId": "eipassoc-0f96bdca17EXAMPLE",
                "IsPrimary": false,
                "Status": "disassociating"
            }
        ]
    }

For more information, see `NAT gateways <https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html>`__ in the *Amazon VPC User Guide*.