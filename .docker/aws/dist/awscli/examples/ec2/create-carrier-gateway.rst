**To create a carrier gateway**

The following ``create-carrier-gateway`` example creates a carrier gateway for the specified VPC. ::

    aws ec2 create-carrier-gateway \
        --vpc-id vpc-0c529aEXAMPLE1111

Output::

    {
        "CarrierGateway": {
            "CarrierGatewayId": "cagw-0465cdEXAMPLE1111",
            "VpcId": "vpc-0c529aEXAMPLE1111",
            "State": "pending",
            "OwnerId": "123456789012"
        }
    }

For more information, see `Carrier gateways <https://docs.aws.amazon.com/wavelength/latest/developerguide/carrier-gateways.html>`__ in the *AWS Wavelength User Guide*.