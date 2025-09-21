**To create a customer gateway**

This example creates a customer gateway with the specified IP address for its outside interface.

Command::

  aws ec2 create-customer-gateway --type ipsec.1 --public-ip 12.1.2.3 --bgp-asn 65534

Output::

  {
      "CustomerGateway": {
          "CustomerGatewayId": "cgw-0e11f167",
          "IpAddress": "12.1.2.3",
          "State": "available",
          "Type": "ipsec.1",
          "BgpAsn": "65534"
      }  
  }