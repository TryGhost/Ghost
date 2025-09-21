**To update the MTU of a virtual interface**

The following ``update-virtual-interface-attributes`` example updates the MTU of the specified virtual interface. ::

    aws directconnect update-virtual-interface-attributes \
        --virtual-interface-id dxvif-fEXAMPLE \
        --mtu 1500

Output::

    {
        "ownerAccount": "1111222233333",
        "virtualInterfaceId": "dxvif-fEXAMPLE",
        "location": "loc1",
        "connectionId": "dxlag-fEXAMPLE",
        "virtualInterfaceType": "transit",
        "virtualInterfaceName": "example transit virtual interface",
        "vlan": 125,
        "asn": 650001,
        "amazonSideAsn": 64512,
        "authKey": "0xzxgA9YoW9h58u8SEXAMPLE",
        "amazonAddress": "169.254.248.1/30",
        "customerAddress": "169.254.248.2/30",
        "addressFamily": "ipv4",
        "virtualInterfaceState": "down",
        "customerRouterConfig": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<logical_connection id=\"dxvif-fEXAMPLE\">\n  <vlan>125</vlan>\n  <customer_address>169.254.248.2/30</customer_address>\n  <amazon_address>169.254.248.1/30</amazon_address>\n  <bgp_asn>650001</bgp_asn>\n  <bgp_auth_key>0xzxgA9YoW9h58u8SEXAMPLE</bgp_auth_key>\n  <amazon_bgp_asn>64512</amazon_bgp_asn>\n  <connection_type>transit</connection_type>\n</logical_connection>\n",
        "mtu": 1500,
        "jumboFrameCapable": true,
        "virtualGatewayId": "",
        "directConnectGatewayId": "879b76a1-403d-4700-8b53-4a56ed85436e",
        "routeFilterPrefixes": [],
        "bgpPeers": [
            {
                "bgpPeerId": "dxpeer-fEXAMPLE",
                "asn": 650001,
                "authKey": "0xzxgA9YoW9h58u8SEXAMPLE",
                "addressFamily": "ipv4",
                "amazonAddress": "169.254.248.1/30",
                "customerAddress": "169.254.248.2/30",
                "bgpPeerState": "available",
                "bgpStatus": "down",
                "awsDeviceV2": "loc1-26wz6vEXAMPLE"
            }
        ],
        "region": "sa-east-1",
        "awsDeviceV2": "loc1-26wz6vEXAMPLE",
        "tags": []
    }
                  

For more information, see `Setting Network MTU for Private Virtual Interfaces or Transit Virtual Interfaces <https://docs.aws.amazon.com/directconnect/latest/UserGuide/set-jumbo-frames-vif.html>`__ in the *AWS Direct Connect User Guide*.
