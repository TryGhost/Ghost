**To associate a virtual private gateway with a Direct Connect gateway**

The following example associates virtual private gateway ``vgw-6efe725e`` with Direct Connect gateway ``5f294f92-bafb-4011-916d-9b0bexample``. You must run the command in the region in which the virtual private gateway is located.

Command::

  aws directconnect create-direct-connect-gateway-association --direct-connect-gateway-id 5f294f92-bafb-4011-916d-9b0bexample --virtual-gateway-id vgw-6efe725e

Output::

  {
    "directConnectGatewayAssociation": {
        "associationState": "associating", 
        "virtualGatewayOwnerAccount": "123456789012", 
        "directConnectGatewayId": "5f294f92-bafb-4011-916d-9b0bexample", 
        "virtualGatewayId": "vgw-6efe725e", 
        "virtualGatewayRegion": "us-east-2"
    }
  }