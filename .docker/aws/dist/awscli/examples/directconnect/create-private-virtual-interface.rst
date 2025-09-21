**To create a private virtual interface**

The following ``create-private-virtual-interface`` command creates a private virtual interface::

  aws directconnect create-private-virtual-interface --connection-id dxcon-ffjrkx17 --new-private-virtual-interface virtualInterfaceName=PrivateVirtualInterface,vlan=101,asn=65000,authKey=asdf34example,amazonAddress=192.168.1.1/30,customerAddress=192.168.1.2/30,virtualGatewayId=vgw-aba37db6

Output::

  {
      "virtualInterfaceState": "pending", 
      "asn": 65000, 
      "vlan": 101, 
      "customerAddress": "192.168.1.2/30", 
      "ownerAccount": "123456789012", 
      "connectionId": "dxcon-ffjrkx17", 
      "virtualGatewayId": "vgw-aba37db6", 
      "virtualInterfaceId": "dxvif-ffhhk74f", 
      "authKey": "asdf34example", 
      "routeFilterPrefixes": [], 
      "location": "TIVIT", 
      "customerRouterConfig": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<logical_connection id=\"dxvif-ffhhk74f\">\n  <vlan>101</vlan>\n  <customer_address>192.168.1.2/30</customer_address>\n  <amazon_address>192.168.1.1/30</amazon_address>\n  <bgp_asn>65000</bgp_asn>\n  <bgp_auth_key>asdf34example</bgp_auth_key>\n  <amazon_bgp_asn>7224</amazon_bgp_asn>\n  <connection_type>private</connection_type>\n</logical_connection>\n", 
      "amazonAddress": "192.168.1.1/30", 
      "virtualInterfaceType": "private", 
      "virtualInterfaceName": "PrivateVirtualInterface"
  }