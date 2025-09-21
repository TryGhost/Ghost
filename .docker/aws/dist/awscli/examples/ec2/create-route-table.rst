**To create a route table**

This example creates a route table for the specified VPC.

Command::

  aws ec2 create-route-table --vpc-id vpc-a01106c2

Output::

  {
      "RouteTable": {
          "Associations": [],
          "RouteTableId": "rtb-22574640",
          "VpcId": "vpc-a01106c2",
          "PropagatingVgws": [],
          "Tags": [],
          "Routes": [
              {
                  "GatewayId": "local",
                  "DestinationCidrBlock": "10.0.0.0/16",
                  "State": "active"
              }
          ]
      }  
  }