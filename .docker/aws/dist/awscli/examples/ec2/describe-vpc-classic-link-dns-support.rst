**To describe ClassicLink DNS support for your VPCs**

This example describes the ClassicLink DNS support status of all of your VPCs. 

Command::

  aws ec2 describe-vpc-classic-link-dns-support

Output::

  {
    "Vpcs": [
      {
        "VpcId": "vpc-88888888", 
        "ClassicLinkDnsSupported": true
      }, 
      {
        "VpcId": "vpc-1a2b3c4d", 
        "ClassicLinkDnsSupported": false
      }
    ]
  }