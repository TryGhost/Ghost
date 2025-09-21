**To disassociate an IPv6 CIDR block from a VPC**

This example disassociates an IPv6 CIDR block from a VPC using the association ID for the CIDR block.

Command::

  aws ec2 disassociate-vpc-cidr-block --association-id vpc-cidr-assoc-eca54085

Output::

  {
    "Ipv6CidrBlockAssociation": {
        "Ipv6CidrBlock": "2001:db8:1234:1a00::/56", 
        "AssociationId": "vpc-cidr-assoc-eca54085", 
        "Ipv6CidrBlockState": {
            "State": "disassociating"
        }
    }, 
    "VpcId": "vpc-a034d6c4"
  }

**To disassociate an IPv4 CIDR block from a VPC**

This example disassociates an IPv4 CIDR block from a VPC.

Command::

  aws ec2 disassociate-vpc-cidr-block --association-id vpc-cidr-assoc-0287ac6b

Output::

  {
    "CidrBlockAssociation": {
        "AssociationId": "vpc-cidr-assoc-0287ac6b", 
        "CidrBlock": "172.18.0.0/16", 
        "CidrBlockState": {
            "State": "disassociating"
        }
    }, 
    "VpcId": "vpc-27621243"
  }