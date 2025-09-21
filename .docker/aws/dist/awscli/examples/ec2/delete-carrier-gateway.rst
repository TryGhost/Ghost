**To delete your carrier gateway**

The following ``delete-carrier-gateway`` example deletes the specified carrier gateway. ::

    aws ec2 delete-carrier-gateway \
        --carrier-gateway-id cagw-0465cdEXAMPLE1111

Output::

    {
        "CarrierGateway": {
            "CarrierGatewayId": "cagw-0465cdEXAMPLE1111",
            "VpcId": "vpc-0c529aEXAMPLE1111",
            "State": "deleting",
            "OwnerId": "123456789012"
        }
    }

For more information, see `Carrier gateways <https://docs.aws.amazon.com/vpc/latest/userguide/Carrier_Gateway.html>`__ in the *Amazon Virtual Private Cloud
User Guide*.