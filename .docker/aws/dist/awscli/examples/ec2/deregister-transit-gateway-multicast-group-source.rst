**To deregister a source from the transit gateway multicast group**

This example deregisters the specified network interface group source from the multicast group. ::

    aws ec2 register-transit-gateway-multicast-group-sources \
        --transit-gateway-multicast-domain-id tgw-mcast-domain-0c4905cef79d6e597 \
        --group-ip-address 224.0.1.0 \
        --network-interface-ids eni-07f290fc3c090cbae 

Output::

    {
        "DeregisteredMulticastGroupSources": {
            "TransitGatewayMulticastDomainId": "tgw-mcast-domain-0c4905cef79d6e597",
            "DeregisteredNetworkInterfaceIds": [
                "eni-07f290fc3c090cbae"
            ],
            "GroupIpAddress": "224.0.1.0"
        }
    }

For more information, see `Deregister Sources from a Multicast Group <https://docs.aws.amazon.com/vpc/latest/tgw/working-with-multicast.html#remove-source-multicast-group>`__ in the *AWS Transit Gateways User Guide*.
