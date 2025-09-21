**To disassociate a security group from a VPC**

The following ``disassociate-security-group-vpc`` example disassociates the specified security group from the specified VPC. ::

    aws ec2 disassociate-security-group-vpc \
        --group-id sg-04dbb43907d3f8a78 \
        --vpc-id vpc-0bf4c2739bc05a694

Output::

    {
        "State": "disassociating"
    }

For more information, see `Associate security groups with multiple VPCs <https://docs.aws.amazon.com/vpc/latest/userguide/security-group-assoc.html>`__ in the *Amazon VPC User Guide*.
