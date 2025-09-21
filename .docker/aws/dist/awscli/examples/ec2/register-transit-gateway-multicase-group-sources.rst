**To register a source with a transit gateway multicast group.**

The following ``register-transit-gateway-multicast-group-sources`` example registers the specified network interface group source with a multicast group. ::

    aws ec2 register-transit-gateway-multicast-group-sources \
        --transit-gateway-multicast-domain-id tgw-mcast-domain-0c4905cef79d6e597 \
        --group-ip-address 224.0.1.0 \
        --network-interface-ids eni-07f290fc3c090cbae 

Output::

    {
        "RegisteredMulticastGroupSources": {
            "TransitGatewayMulticastDomainId": "tgw-mcast-domain-0c4905cef79d6e597",
            "RegisteredNetworkInterfaceIds": [
                "eni-07f290fc3c090cbae"
            ],
            "GroupIpAddress": "224.0.1.0"
        }
    }

For more information, see `Register Sources with a Multicast Group <https://docs.aws.amazon.com/vpc/latest/tgw/working-with-multicast.html#add-source-multicast-group>`__ in the *AWS Transit Gateways User Guide*.
