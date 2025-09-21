**To associate a virtual interface with a connection**

The following example associates the specified virtual interface with the specified LAG. Alternatively, to associate the virtual interface with a connection, specify the ID of an AWS Direct Connect connection for ``--connection-id``; for example, ``dxcon-ffnikghc``.

Command::

  aws directconnect associate-virtual-interface --connection-id dxlag-ffjhj9lx --virtual-interface-id dxvif-fgputw0j
  
Output::

  {
    "virtualInterfaceState": "pending", 
    "asn": 65000, 
    "vlan": 123, 
    "customerAddress": "169.254.255.2/30", 
    "ownerAccount": "123456789012", 
    "connectionId": "dxlag-ffjhj9lx", 
    "addressFamily": "ipv4", 
    "virtualGatewayId": "vgw-38e90b51", 
    "virtualInterfaceId": "dxvif-fgputw0j", 
    "authKey": "0x123pK5_VBqv.UQ3kJ4123_", 
    "routeFilterPrefixes": [], 
    "location": "CSVA1", 
    "bgpPeers": [
        {
            "bgpStatus": "down", 
            "customerAddress": "169.254.255.2/30", 
            "addressFamily": "ipv4", 
            "authKey": "0x123pK5_VBqv.UQ3kJ4123_", 
            "bgpPeerState": "deleting", 
            "amazonAddress": "169.254.255.1/30", 
            "asn": 65000
        }, 
        {
            "bgpStatus": "down", 
            "customerAddress": "169.254.255.2/30", 
            "addressFamily": "ipv4", 
            "authKey": "0x123pK5_VBqv.UQ3kJ4123_", 
            "bgpPeerState": "pending", 
            "amazonAddress": "169.254.255.1/30", 
            "asn": 65000
        }
    ], 
    "customerRouterConfig": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<logical_connection id=\"dxvif-fgputw0j\">\n  <vlan>123</vlan>\n  <customer_address>169.254.255.2/30</customer_address>\n  <amazon_address>169.254.255.1/30</amazon_address>\n  <bgp_asn>65000</bgp_asn>\n  <bgp_auth_key>0x123pK5_VBqv.UQ3kJ4123_</bgp_auth_key>\n  <amazon_bgp_asn>7224</amazon_bgp_asn>\n  <connection_type>private</connection_type>\n</logical_connection>\n", 
    "amazonAddress": "169.254.255.1/30", 
    "virtualInterfaceType": "private", 
    "virtualInterfaceName": "VIF1A"
  }