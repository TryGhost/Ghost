**To associate an IPv6 CIDR block with a subnet**

This example associates an IPv6 CIDR block with the specified subnet.

Command::

  aws ec2 associate-subnet-cidr-block --subnet-id subnet-5f46ec3b --ipv6-cidr-block 2001:db8:1234:1a00::/64

Output::

  {
    "SubnetId": "subnet-5f46ec3b", 
    "Ipv6CidrBlockAssociation": {
        "Ipv6CidrBlock": "2001:db8:1234:1a00::/64", 
        "AssociationId": "subnet-cidr-assoc-3aa54053", 
        "Ipv6CidrBlockState": {
            "State": "associating"
        }
    }
  }