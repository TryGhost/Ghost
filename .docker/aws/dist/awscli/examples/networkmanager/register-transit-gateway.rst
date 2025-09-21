**To register a transit gateway in a global network**

The following ``register-transit-gateway`` example registers transit gateway ``tgw-123abc05e04123abc`` in the specified global network. ::

    aws networkmanager register-transit-gateway \
        --global-network-id global-network-01231231231231231 \
        --transit-gateway-arn arn:aws:ec2:us-west-2:123456789012:transit-gateway/tgw-123abc05e04123abc \
        --region us-west-2

Output::

    {
        "TransitGatewayRegistration": {
            "GlobalNetworkId": "global-network-01231231231231231",
            "TransitGatewayArn": "arn:aws:ec2:us-west-2:123456789012:transit-gateway/tgw-123abc05e04123abc",
            "State": {
                "Code": "PENDING"
            }
        }
    }

For more information, see `Transit Gateway Registrations <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-registrations.html>`__ in the *Transit Gateway Network Manager Guide*.
