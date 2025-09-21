**To describe VPC associations**

The following ``describe-security-group-vpc-associations`` example describes the VPC associations for the specified security group. ::

    aws ec2 describe-security-group-vpc-associations \
        --filters Name=group-id,Values=sg-04dbb43907d3f8a78

Output::

    {
        "SecurityGroupVpcAssociations": [
            {
                "GroupId": "sg-04dbb43907d3f8a78",
                "VpcId": "vpc-0bf4c2739bc05a694",
                "VpcOwnerId": "123456789012",
                "State": "associated"
            }
        ]
    }

For more information, see `Associate security groups with multiple VPCs <https://docs.aws.amazon.com/vpc/latest/userguide/security-group-assoc.html>`__ in the *Amazon VPC User Guide*.
