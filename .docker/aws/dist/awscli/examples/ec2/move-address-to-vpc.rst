**To move an address to EC2-VPC**

This example moves Elastic IP address 54.123.4.56 to the EC2-VPC platform.

Command::

  aws ec2 move-address-to-vpc --public-ip 54.123.4.56

Output::

  {
    "Status": "MoveInProgress"
  }