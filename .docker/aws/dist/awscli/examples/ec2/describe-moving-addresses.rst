**To describe your moving addresses**

This example describes all of your moving Elastic IP addresses.

Command::

  aws ec2 describe-moving-addresses

Output::

  {
    "MovingAddressStatuses": [
      {
        "PublicIp": "198.51.100.0",
        "MoveStatus": "MovingToVpc"
      }
    ]
  }

This example describes all addresses that are moving to the EC2-VPC platform.

Command::

  aws ec2 describe-moving-addresses --filters Name=moving-status,Values=MovingToVpc