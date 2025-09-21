**To provision a public virtual interface**

The following ``allocate-public-virtual-interface`` command provisions a public virtual interface to be owned by a different customer::

  aws directconnect allocate-public-virtual-interface --connection-id dxcon-ffjrkx17 --owner-account 123456789012 --new-public-virtual-interface-allocation virtualInterfaceName=PublicVirtualInterface,vlan=2000,asn=65000,authKey=asdf34example,amazonAddress=203.0.113.1/30,customerAddress=203.0.113.2/30,routeFilterPrefixes=[{cidr=203.0.113.0/30},{cidr=203.0.113.4/30}]

Output::

  {
      "virtualInterfaceState": "confirming", 
      "asn": 65000, 
      "vlan": 2000, 
      "customerAddress": "203.0.113.2/30", 
      "ownerAccount": "123456789012", 
      "connectionId": "dxcon-ffjrkx17", 
      "virtualInterfaceId": "dxvif-fg9xo9vp", 
      "authKey": "asdf34example", 
      "routeFilterPrefixes": [
          {
              "cidr": "203.0.113.0/30"
          }, 
          {
              "cidr": "203.0.113.4/30"
          }
      ], 
      "location": "TIVIT", 
      "customerRouterConfig": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<logical_connection id=\"dxvif-fg9xo9vp\">\n  <vlan>2000</vlan>\n  <customer_address>203.0.113.2/30</customer_address>\n  <amazon_address>203.0.113.1/30</amazon_address>\n  <bgp_asn>65000</bgp_asn>\n  <bgp_auth_key>asdf34example</bgp_auth_key>\n  <amazon_bgp_asn>7224</amazon_bgp_asn>\n  <connection_type>public</connection_type>\n</logical_connection>\n", 
      "amazonAddress": "203.0.113.1/30", 
      "virtualInterfaceType": "public", 
      "virtualInterfaceName": "PublicVirtualInterface"
  }