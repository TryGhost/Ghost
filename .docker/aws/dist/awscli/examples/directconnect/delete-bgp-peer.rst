**To delete a BGP peer from a virtual interface**

The following example deletes the IPv6 BGP peer from virtual interface ``dxvif-fg1vuj3d``.

Command::

  aws directconnect delete-bgp-peer --virtual-interface-id dxvif-fg1vuj3d --asn 64600 --customer-address 2001:db8:1100:2f0:0:1:9cb4:4216/125
  
Output::

  {
    "virtualInterface": {
        "virtualInterfaceState": "available", 
        "asn": 65000, 
        "vlan": 125, 
        "customerAddress": "169.254.255.2/30", 
        "ownerAccount": "123456789012", 
        "connectionId": "dxcon-fguhmqlc", 
        "addressFamily": "ipv4", 
        "virtualGatewayId": "vgw-f9eb0c90", 
        "virtualInterfaceId": "dxvif-fg1vuj3d", 
        "authKey": "0xC_ukbCerl6EYA0example", 
        "routeFilterPrefixes": [], 
        "location": "EqDC2", 
        "bgpPeers": [
            {
                "bgpStatus": "down", 
                "customerAddress": "169.254.255.2/30", 
                "addressFamily": "ipv4", 
                "authKey": "0xC_ukbCerl6EYA0uexample", 
                "bgpPeerState": "available", 
                "amazonAddress": "169.254.255.1/30", 
                "asn": 65000
            }, 
            {
                "bgpStatus": "down", 
                "customerAddress": "2001:db8:1100:2f0:0:1:9cb4:4216/125", 
                "addressFamily": "ipv6", 
                "authKey": "0xS27kAIU_VHPjjAexample", 
                "bgpPeerState": "deleting", 
                "amazonAddress": "2001:db8:1100:2f0:0:1:9cb4:4211/125", 
                "asn": 64600
            }
        ], 
        "customerRouterConfig": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<logical_connection id=\"dxvif-fg1vuj3d\">\n  <vlan>125</vlan>\n  <customer_address>169.254.255.2/30</customer_address>\n  <amazon_address>169.254.255.1/30</amazon_address>\n  <bgp_asn>65000</bgp_asn>\n  <bgp_auth_key>0xC_ukbCerl6EYA0example</bgp_auth_key>\n  <amazon_bgp_asn>7224</amazon_bgp_asn>\n  <connection_type>private</connection_type>\n</logical_connection>\n", 
        "amazonAddress": "169.254.255.1/30", 
        "virtualInterfaceType": "private", 
        "virtualInterfaceName": "Test"
    }
  }