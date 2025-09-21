**To list all virtual interfaces**

The following ``describe-virtual-interfaces`` command lists the information about all virtual interfaces associated with your AWS account::

  aws directconnect describe-virtual-interfaces --connection-id dxcon-ffjrkx17

Output::

  {
      "virtualInterfaces": [
          {
              "virtualInterfaceState": "down", 
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
          }, 
          {
              "virtualInterfaceState": "verifying", 
              "asn": 65000, 
              "vlan": 2000, 
              "customerAddress": "203.0.113.2/30", 
              "ownerAccount": "123456789012", 
              "connectionId": "dxcon-ffjrkx17", 
              "virtualGatewayId": "", 
              "virtualInterfaceId": "dxvif-fgh0hcrk", 
              "authKey": "asdf34example", 
              "routeFilterPrefixes": [
                  {
                      "cidr": "203.0.113.4/30"
                  }, 
                  {
                      "cidr": "203.0.113.0/30"
                  }
              ], 
              "location": "TIVIT", 
              "customerRouterConfig": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<logical_connection id=\"dxvif-fgh0hcrk\">\n  <vlan>2000</vlan>\n  <customer_address>203.0.113.2/30</customer_address>\n  <amazon_address>203.0.113.1/30</amazon_address>\n  <bgp_asn>65000</bgp_asn>\n  <bgp_auth_key>asdf34example</bgp_auth_key>\n  <amazon_bgp_asn>7224</amazon_bgp_asn>\n  <connection_type>public</connection_type>\n</logical_connection>\n", 
              "amazonAddress": "203.0.113.1/30", 
              "virtualInterfaceType": "public", 
              "virtualInterfaceName": "PublicVirtualInterface"
          }
      ]
  }