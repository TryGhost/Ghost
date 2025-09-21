**To describe your customer gateways**

This example describes your customer gateways.

Command::

  aws ec2 describe-customer-gateways 

Output::

  {
      "CustomerGateways": [
          {
              "CustomerGatewayId": "cgw-b4dc3961",
              "IpAddress": "203.0.113.12",
              "State": "available",
              "Type": "ipsec.1",
              "BgpAsn": "65000"
          },
          {
              "CustomerGatewayId": "cgw-0e11f167",
              "IpAddress": "12.1.2.3",
              "State": "available",
              "Type": "ipsec.1",
              "BgpAsn": "65534"
          }
      ]  
  }
  
**To describe a specific customer gateway**

This example describes the specified customer gateway.

Command::

  aws ec2 describe-customer-gateways --customer-gateway-ids cgw-0e11f167

Output::

  {
      "CustomerGateways": [
          {
              "CustomerGatewayId": "cgw-0e11f167",
              "IpAddress": "12.1.2.3",
              "State": "available",
              "Type": "ipsec.1",
              "BgpAsn": "65534"
          }
      ]  
  }  