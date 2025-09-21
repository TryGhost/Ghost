**To describe the ClassicLink status of your VPCs**

This example lists the ClassicLink status of vpc-88888888.

Command::

  aws ec2 describe-vpc-classic-link --vpc-id vpc-88888888

Output::

  {
    "Vpcs": [
      {
        "ClassicLinkEnabled": true, 
        "VpcId": "vpc-88888888", 
        "Tags": [
          {
            "Value": "classiclinkvpc", 
            "Key": "Name"
          }
        ]
      }
    ]
  }

This example lists only VPCs that are enabled for Classiclink (the filter value of ``is-classic-link-enabled`` is set to ``true``).

Command::

  aws ec2 describe-vpc-classic-link --filter "Name=is-classic-link-enabled,Values=true"
