**To deregister group members from a multicast group**

This example deregisters the specified network interface group member from the transit gateway multicast group. ::

    aws ec2 deregister-transit-gateway-multicast-group-members \
        --transit-gateway-multicast-domain-id tgw-mcast-domain-0c4905cef7EXAMPLE \
        --group-ip-address 224.0.1.0 \
        --network-interface-ids eni-0e246d3269EXAMPLE

Output::

    {
        "DeregisteredMulticastGroupMembers": {
            "TransitGatewayMulticastDomainId": "tgw-mcast-domain-0c4905cef7EXAMPLE",
            "RegisteredNetworkInterfaceIds": [
                "eni-0e246d3269EXAMPLE"
            ],
            "GroupIpAddress": "224.0.1.0"
        }
    }

For more information, see `Deregister Members from a Multicast Group <https://docs.aws.amazon.com/vpc/latest/tgw/working-with-multicast.html#remove-members-multicast-group>`__ in the *AWS Transit Gateways Users Guide*.