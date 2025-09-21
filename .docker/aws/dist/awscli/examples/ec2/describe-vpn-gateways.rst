**To describe your virtual private gateways**

This example describes your virtual private gateways.

Command::

  aws ec2 describe-vpn-gateways

Output::

  {
      "VpnGateways": [
          {
              "State": "available",
              "Type": "ipsec.1",
              "VpnGatewayId": "vgw-f211f09b",
              "VpcAttachments": [
                  {
                      "State": "attached",
                      "VpcId": "vpc-98eb5ef5"
                  }
              ]
          },
          {
              "State": "available",
              "Type": "ipsec.1",
              "VpnGatewayId": "vgw-9a4cacf3",
              "VpcAttachments": [
                  {
                      "State": "attaching",
                      "VpcId": "vpc-a01106c2"
                  }
              ]
          }
      ]  
  }