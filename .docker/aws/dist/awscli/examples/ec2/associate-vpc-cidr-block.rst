**Example 1: To associate an Amazon-provided IPv6 CIDR block with a VPC**

The following ``associate-vpc-cidr-block`` example associates an IPv6 CIDR block with the specified VPC.::

    aws ec2 associate-vpc-cidr-block \
        --amazon-provided-ipv6-cidr-block \
        --ipv6-cidr-block-network-border-group us-west-2-lax-1  \
        --vpc-id vpc-8EXAMPLE

Output::

    {
        "Ipv6CidrBlockAssociation": {
            "AssociationId": "vpc-cidr-assoc-0838ce7d9dEXAMPLE",
            "Ipv6CidrBlockState": {
                "State": "associating"
            },
            "NetworkBorderGroup": "us-west-2-lax-1"
        },
        "VpcId": "vpc-8EXAMPLE"
    }

**Example 2:To associate an additional IPv4 CIDR block with a VPC**

The following ``associate-vpc-cidr-block`` example associates the IPv4 CIDR block ``10.2.0.0/16`` with the specified VPC. ::

    aws ec2 associate-vpc-cidr-block \
        --vpc-id vpc-1EXAMPLE \
        --cidr-block 10.2.0.0/16

Output::

    {
        "CidrBlockAssociation": {
            "AssociationId": "vpc-cidr-assoc-2EXAMPLE", 
            "CidrBlock": "10.2.0.0/16", 
            "CidrBlockState": {
                "State": "associating"
            }
        }, 
        "VpcId": "vpc-1EXAMPLE"
    }
