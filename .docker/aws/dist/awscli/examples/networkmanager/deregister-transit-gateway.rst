**To deregister a transit gateway from a global network**

The following ``deregister-transit-gateway`` example deregisters the specified transit gateway from the specified global network. ::

    aws networkmanager deregister-transit-gateway \
        --global-network-id global-network-01231231231231231 \
        --transit-gateway-arn arn:aws:ec2:us-west-2:123456789012:transit-gateway/tgw-123abc05e04123abc \
        --region us-west-2

Output::

    {
        "TransitGatewayRegistration": {
            "GlobalNetworkId": "global-network-01231231231231231",
            "TransitGatewayArn": "arn:aws:ec2:us-west-2:123456789012:transit-gateway/tgw-123abc05e04123abc",
            "State": {
                "Code": "DELETING"
            }
        }
    }

For more information, see `Transit Gateway Registrations <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-registrations.html>`__ in the *Transit Gateway Network Manager Guide*.
