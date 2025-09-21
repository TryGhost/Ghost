**To delete a transit gateway multicast domain**

The following ``delete-transit-gateway-multicast-domain`` example deletes the specified multicast domain. ::

    aws ec2 delete-transit-gateway-multicast-domain \
        --transit-gateway-multicast-domain-id tgw-mcast-domain-0c4905cef7EXAMPLE

Output::

    {
        "TransitGatewayMulticastDomain": {
            "TransitGatewayMulticastDomainId": "tgw-mcast-domain-02bb79002bEXAMPLE",
            "TransitGatewayId": "tgw-0d88d2d0d5EXAMPLE",
            "State": "deleting",
            "CreationTime": "2019-11-20T22:02:03.000Z"
        }
    }

For more information, see `Managing multicast domains <https://docs.aws.amazon.com/vpc/latest/tgw/manage-domain.html>`__ in the *Transit Gateways Guide*.