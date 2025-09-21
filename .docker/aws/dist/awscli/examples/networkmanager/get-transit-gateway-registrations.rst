**To get your transit gateway registrations**

The following ``get-transit-gateway-registrations`` example gets the transit gateways that are registered to the specified global network. ::

    aws networkmanager get-transit-gateway-registrations \
        --global-network-id global-network-01231231231231231 \
        --region us-west-2

Output::

    {
        "TransitGatewayRegistrations": [
            {
                "GlobalNetworkId": "global-network-01231231231231231",
                "TransitGatewayArn": "arn:aws:ec2:us-west-2:123456789012:transit-gateway/tgw-123abc05e04123abc",
                "State": {
                    "Code": "AVAILABLE"
                }
            }
        ]
    }
