**To describe your Direct Connect gateways**

The following example describe all of your Direct Connect gateways. 

Command::

  aws directconnect describe-direct-connect-gateways

Output::

  {
    "directConnectGateways": [
        {
            "amazonSideAsn": 64512, 
            "directConnectGatewayId": "cf68415c-f4ae-48f2-87a7-3b52cexample", 
            "ownerAccount": "123456789012", 
            "directConnectGatewayName": "DxGateway2", 
            "directConnectGatewayState": "available"
        }, 
        {
            "amazonSideAsn": 64512, 
            "directConnectGatewayId": "5f294f92-bafb-4011-916d-9b0bdexample", 
            "ownerAccount": "123456789012", 
            "directConnectGatewayName": "DxGateway1", 
            "directConnectGatewayState": "available"
        }
    ]
  }