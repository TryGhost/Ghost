**To release an Elastic IP addresses for EC2-Classic**

This example releases an Elastic IP address for use with instances in EC2-Classic. If the command succeeds, no output is returned.

Command::

  aws ec2 release-address --public-ip 198.51.100.0

**To release an Elastic IP address for EC2-VPC**

This example releases an Elastic IP address for use with instances in a VPC. If the command succeeds, no output is returned.

Command::

  aws ec2 release-address --allocation-id eipalloc-64d5890a
