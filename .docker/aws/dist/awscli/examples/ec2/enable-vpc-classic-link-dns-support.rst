**To enable ClassicLink DNS support for a VPC**

This example enables ClassicLink DNS support for ``vpc-88888888``.

Command::

  aws ec2 enable-vpc-classic-link-dns-support --vpc-id vpc-88888888

Output::

  {
    "Return": true
  }