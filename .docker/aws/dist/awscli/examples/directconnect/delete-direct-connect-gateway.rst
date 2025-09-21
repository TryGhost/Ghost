**To delete a Direct Connect gateway**

The following example deletes Direct Connect gateway ``5f294f92-bafb-4011-916d-9b0bexample``.

Command::

  aws directconnect delete-direct-connect-gateway --direct-connect-gateway-id 5f294f92-bafb-4011-916d-9b0bexample

Output::

  {
    "directConnectGateway": {
        "amazonSideAsn": 64512, 
        "directConnectGatewayId": "5f294f92-bafb-4011-916d-9b0bexample", 
        "ownerAccount": "123456789012", 
        "directConnectGatewayName": "DxGateway1", 
        "directConnectGatewayState": "deleting"
    }
  }