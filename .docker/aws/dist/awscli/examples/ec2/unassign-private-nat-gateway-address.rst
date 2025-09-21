**To unassign a private IP address from your private NAT gateway**

The following ``unassign-private-nat-gateway-address`` example unassigns the specifed IP address from the specified private NAT gateway. ::

    aws ec2 unassign-private-nat-gateway-address \
        --nat-gateway-id nat-1234567890abcdef0 \
        --private-ip-addresses 10.0.20.197

Output::

    {
        "NatGatewayId": "nat-0ee3edd182361f662",
        "NatGatewayAddresses": [
            {
                "NetworkInterfaceId": "eni-0065a61b324d1897a",
                "PrivateIp": "10.0.20.197",
                "IsPrimary": false,
                "Status": "unassigning"
            }
        ]
    }

For more information, see `NAT gateways <https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html>`__ in the *Amazon VPC User Guide*.