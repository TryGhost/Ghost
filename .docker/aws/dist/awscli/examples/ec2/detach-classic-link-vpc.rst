**To unlink (detach) an EC2-Classic instance from a VPC**

This example unlinks instance i-0598c7d356eba48d7 from VPC vpc-88888888.

Command::

  aws ec2 detach-classic-link-vpc --instance-id i-0598c7d356eba48d7 --vpc-id vpc-88888888

Output::

  {
    "Return": true
  }