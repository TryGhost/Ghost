**To disassociate an IPv6 CIDR block from a subnet**

This example disassociates an IPv6 CIDR block from a subnet using the association ID for the CIDR block.

Command::

  aws ec2 disassociate-subnet-cidr-block --association-id subnet-cidr-assoc-3aa54053

Output::

  {
    "SubnetId": "subnet-5f46ec3b", 
    "Ipv6CidrBlockAssociation": {
        "Ipv6CidrBlock": "2001:db8:1234:1a00::/64", 
        "AssociationId": "subnet-cidr-assoc-3aa54053", 
        "Ipv6CidrBlockState": {
            "State": "disassociating"
        }
    }
  }