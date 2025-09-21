**To associate a security group with another VPC**

The following ``associate-security-group-vpc`` example associates the specified security group with the specified VPC. ::

    aws ec2 associate-security-group-vpc \
        --group-id sg-04dbb43907d3f8a78 \
        --vpc-id vpc-0bf4c2739bc05a694

Output::

    {
        "State": "associating"
    }

For more information, see `Associate security groups with multiple VPCs <https://docs.aws.amazon.com/vpc/latest/userguide/security-group-assoc.html>`__ in the *Amazon VPC User Guide*.
