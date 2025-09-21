**To get your customer gateway associations**

The following ``get-customer-gateway-associations`` example gets the customer gateway associations for the specified global network. ::

    aws networkmanager get-customer-gateway-associations \
        --global-network-id global-network-01231231231231231 \
        --region us-west-2

Output::

    {
        "CustomerGatewayAssociations": [
            {
                "CustomerGatewayArn": "arn:aws:ec2:us-west-2:123456789012:customer-gateway/cgw-11223344556677889",
                "GlobalNetworkId": "global-network-01231231231231231",
                "DeviceId": "device-07f6fd08867abc123",
                "State": "AVAILABLE"
            }
        ]
    }
