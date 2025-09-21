**To create a Direct Connect gateway**

The following example creates a Direct Connect gateway with the name ``DxGateway1``. 

Command::

  aws directconnect create-direct-connect-gateway --direct-connect-gateway-name "DxGateway1"

Output::

  {
    "directConnectGateway": {
        "amazonSideAsn": 64512, 
        "directConnectGatewayId": "5f294f92-bafb-4011-916d-9b0bdexample", 
        "ownerAccount": "123456789012", 
        "directConnectGatewayName": "DxGateway1", 
        "directConnectGatewayState": "available"
    }
  }