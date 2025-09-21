**To list virtual private gateways**

The following ``describe-virtual-gateways`` command lists virtual private gateways owned by your AWS account::

  aws directconnect describe-virtual-gateways

Output::

  {
      "virtualGateways": [
          {
              "virtualGatewayId": "vgw-aba37db6", 
              "virtualGatewayState": "available"
          }
      ]
  }