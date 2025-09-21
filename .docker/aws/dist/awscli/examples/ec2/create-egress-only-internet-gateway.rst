**To create an egress-only Internet gateway**

This example creates an egress-only Internet gateway for the specified VPC.

Command::

  aws ec2 create-egress-only-internet-gateway --vpc-id vpc-0c62a468

Output::

  {
    "EgressOnlyInternetGateway": {
        "EgressOnlyInternetGatewayId": "eigw-015e0e244e24dfe8a", 
        "Attachments": [
            {
                "State": "attached", 
                "VpcId": "vpc-0c62a468"
            }
        ]
    }
  }