**To link (attach) an EC2-Classic instance to a VPC**

This example links instance i-1234567890abcdef0 to VPC vpc-88888888 through the VPC security group sg-12312312.

Command::

  aws ec2 attach-classic-link-vpc --instance-id  i-1234567890abcdef0 --vpc-id vpc-88888888 --groups sg-12312312

Output::

  {
    "Return": true
  }