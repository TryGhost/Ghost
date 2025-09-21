**To disassociate a customer gateway**

The following ``disassociate-customer-gateway`` example disassociates the specified customer gateway (``cgw-11223344556677889``) from the specified global network. ::

    aws networkmanager disassociate-customer-gateway \
        --global-network-id global-network-01231231231231231 \
        --customer-gateway-arn arn:aws:ec2:us-west-2:123456789012:customer-gateway/cgw-11223344556677889 \
        --region us-west-2

Output::

    {
        "CustomerGatewayAssociation": {
            "CustomerGatewayArn": "arn:aws:ec2:us-west-2:123456789012:customer-gateway/cgw-11223344556677889",
            "GlobalNetworkId": "global-network-01231231231231231",
            "DeviceId": "device-07f6fd08867abc123",
            "State": "DELETING"
        }
    }

For more information, see `Customer Gateway Associations <https://docs.aws.amazon.com/vpc/latest/tgw/on-premises-networks.html#cgw-association>`__ in the *Transit Gateway Network Manager Guide*.
