**To create a route**

This example creates a route for the specified route table. The route matches all IPv4 traffic (``0.0.0.0/0``) and routes it to the specified Internet gateway. If the command succeeds, no output is returned.

Command::

  aws ec2 create-route --route-table-id rtb-22574640 --destination-cidr-block 0.0.0.0/0 --gateway-id igw-c0a643a9

This example command creates a route in route table rtb-g8ff4ea2. The route matches traffic for the IPv4 CIDR block
10.0.0.0/16 and routes it to VPC peering connection, pcx-111aaa22. This route enables traffic to be directed to the peer
VPC in the VPC peering connection. If the command succeeds, no output is returned.

Command::

  aws ec2 create-route --route-table-id rtb-g8ff4ea2 --destination-cidr-block 10.0.0.0/16 --vpc-peering-connection-id pcx-1a2b3c4d
  
This example creates a route in the specified route table that matches all IPv6 traffic (``::/0``) and routes it to the specified egress-only Internet gateway. 

Command::

  aws ec2 create-route --route-table-id rtb-dce620b8 --destination-ipv6-cidr-block ::/0 --egress-only-internet-gateway-id eigw-01eadbd45ecd7943f
