**To describe all carrier gateways**

The following ``describe-carrier-gateways`` example lists all your carrier gateways. ::

    aws ec2 describe-carrier-gateways

Output::

    {
        "CarrierGateways": [
            {
                "CarrierGatewayId": "cagw-0465cdEXAMPLE1111",
                "VpcId": "vpc-0c529aEXAMPLE",
                "State": "available",
                "OwnerId": "123456789012",
                "Tags": [
                    {
                        
                        "Key": "example",
                        "Value": "tag"
                    }
                ]
            }
        ]
    }

For more information, see `Carrier gateways<https://docs.aws.amazon.com/vpc/latest/userguide/Carrier_Gateway.html>`__ in the *Amazon Virtual Private Cloud
User Guide*.