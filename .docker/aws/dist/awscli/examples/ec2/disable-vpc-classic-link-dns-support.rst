**To disable ClassicLink DNS support for a VPC**

This example disables ClassicLink DNS support for ``vpc-88888888``.

Command::

  aws ec2 disable-vpc-classic-link-dns-support --vpc-id vpc-88888888

Output::

  {
    "Return": true
  }