**To accept a VPC peering connection**

This example accepts the specified VPC peering connection request.

Command::

  aws ec2 accept-vpc-peering-connection --vpc-peering-connection-id pcx-1a2b3c4d

Output::

  {
    "VpcPeeringConnection": {
      "Status": {
        "Message": "Provisioning",
        "Code": "provisioning"
      },
      "Tags": [],
      "AccepterVpcInfo": {
        "OwnerId": "444455556666",
        "VpcId": "vpc-44455566",
        "CidrBlock": "10.0.1.0/28"
      },
      "VpcPeeringConnectionId": "pcx-1a2b3c4d",
      "RequesterVpcInfo": {
        "OwnerId": "444455556666",
        "VpcId": "vpc-111abc45",
        "CidrBlock": "10.0.0.0/28"
      }
    }
  }