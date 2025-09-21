**To provision a private virtual interface**

The following ``allocate-private-virtual-interface`` command provisions a private virtual interface to be owned by a different customer::

  aws directconnect allocate-private-virtual-interface --connection-id dxcon-ffjrkx17 --owner-account 123456789012 --new-private-virtual-interface-allocation virtualInterfaceName=PrivateVirtualInterface,vlan=1000,asn=65000,authKey=asdf34example,amazonAddress=192.168.1.1/30,customerAddress=192.168.1.2/30

Output::

  {
      "virtualInterfaceState": "confirming", 
      "asn": 65000, 
      "vlan": 1000, 
      "customerAddress": "192.168.1.2/30", 
      "ownerAccount": "123456789012", 
      "connectionId": "dxcon-ffjrkx17", 
      "virtualInterfaceId": "dxvif-fgy8orxu", 
      "authKey": "asdf34example", 
      "routeFilterPrefixes": [], 
      "location": "TIVIT", 
      "customerRouterConfig": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n  <logical_connection id=\"dxvif-fgy8orxu\">\n  <vlan>1000</vlan>\n  <customer_address>192.168.1.2/30</customer_address>\n  <amazon_address>192.168.1.1/30</amazon_address>\n  <bgp_asn>65000</bgp_asn>\n  <bgp_auth_key>asdf34example</bgp_auth_key>\n  <amazon_bgp_asn>7224</amazon_bgp_asn>\n  <connection_type>private</connection_type>\n</logical_connection>\n", 
      "amazonAddress": "192.168.1.1/30", 
      "virtualInterfaceType": "private", 
      "virtualInterfaceName": "PrivateVirtualInterface"
  }
