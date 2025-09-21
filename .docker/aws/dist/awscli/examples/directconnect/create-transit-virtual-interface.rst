**To create a transit virtual interface**

The following ``create-transit-virtual-interface`` example creates a transit virtual interface for the specified connection. ::

    aws directconnect create-transit-virtual-interface \
        --connection-id dxlag-fEXAMPLE \
        --new-transit-virtual-interface "virtualInterfaceName=Example Transit Virtual Interface,vlan=126,asn=65110,mtu=1500,authKey=0xzxgA9YoW9h58u8SvEXAMPLE,amazonAddress=192.168.1.1/30,customerAddress=192.168.1.2/30,addressFamily=ipv4,directConnectGatewayId=8384da05-13ce-4a91-aada-5a1baEXAMPLE,tags=[{key=Tag,value=Example}]"

Output::

    {
        "virtualInterface": {
            "ownerAccount": "1111222233333",
            "virtualInterfaceId": "dxvif-fEXAMPLE",
            "location": "loc1",
            "connectionId": "dxlag-fEXAMPLE",
            "virtualInterfaceType": "transit",
            "virtualInterfaceName": "Example Transit Virtual Interface",
            "vlan": 126,
            "asn": 65110,
            "amazonSideAsn": 4200000000,
            "authKey": "0xzxgA9YoW9h58u8SEXAMPLE",
            "amazonAddress": "192.168.1.1/30",
            "customerAddress": "192.168.1.2/30",
            "addressFamily": "ipv4",
            "virtualInterfaceState": "pending",
            "customerRouterConfig": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<logical_connection id=\"dxvif-fEXAMPLE\">\n  <vlan>126</vlan>\n  <customer_address>192.168.1.2/30</customer_address>\n  <amazon_address>192.168.1.1/30</amazon_address>\n  <bgp_asn>65110</bgp_asn>\n  <bgp_auth_key>0xzxgA9YoW9h58u8SvOmXRTw</bgp_auth_key>\n  <amazon_bgp_asn>4200000000</amazon_bgp_asn>\n  <connection_type>transit</connection_type>\n</logical_connection>\n",
            "mtu": 1500,
            "jumboFrameCapable": true,
            "virtualGatewayId": "",
            "directConnectGatewayId": "8384da05-13ce-4a91-aada-5a1baEXAMPLE",
            "routeFilterPrefixes": [],
            "bgpPeers": [
                {
                    "bgpPeerId": "dxpeer-EXAMPLE",
                    "asn": 65110,
                    "authKey": "0xzxgA9YoW9h58u8SEXAMPLE",
                    "addressFamily": "ipv4",
                    "amazonAddress": "192.168.1.1/30",
                    "customerAddress": "192.168.1.2/30",
                    "bgpPeerState": "pending",
                    "bgpStatus": "down",
                    "awsDeviceV2": "loc1-26wz6vEXAMPLE"
                }
            ],
            "region": "sa-east-1",
            "awsDeviceV2": "loc1-26wz6vEXAMPLE",
            "tags": [
                {
                    "key": "Tag",
                    "value": "Example"
                }
            ]
        }
    }

For more information, see `Creating a Transit Virtual Interface to the Direct Connect Gateway <https://docs.aws.amazon.com/directconnect/latest/UserGuide/create-vif.html#create-transit-vif>`__ in the *AWS Direct Connect User Guide*.