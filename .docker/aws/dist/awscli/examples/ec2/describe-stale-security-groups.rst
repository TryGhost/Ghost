**To describe stale security groups**

This example describes stale security group rules for ``vpc-11223344``. The response shows that sg-5fa68d3a in your account has a stale ingress SSH rule that references ``sg-279ab042`` in the peer VPC, and that ``sg-fe6fba9a`` in your account has a stale egress SSH rule that references ``sg-ef6fba8b`` in the peer VPC.

Command::

  aws ec2 describe-stale-security-groups --vpc-id vpc-11223344

Output::

  {
    "StaleSecurityGroupSet": [
        {
            "VpcId": "vpc-11223344", 
            "StaleIpPermissionsEgress": [
                {
                    "ToPort": 22, 
                    "FromPort": 22, 
                    "UserIdGroupPairs": [
                        {
                            "VpcId": "vpc-7a20e51f", 
                            "GroupId": "sg-ef6fba8b", 
                            "VpcPeeringConnectionId": "pcx-b04deed9", 
                            "PeeringStatus": "active"
                        }
                    ], 
                    "IpProtocol": "tcp"
                }
            ], 
            "GroupName": "MySG1", 
            "StaleIpPermissions": [], 
            "GroupId": "sg-fe6fba9a", 
            "Description": MySG1"
        }, 
        {
            "VpcId": "vpc-11223344", 
            "StaleIpPermissionsEgress": [], 
            "GroupName": "MySG2", 
            "StaleIpPermissions": [
                {
                    "ToPort": 22, 
                    "FromPort": 22, 
                    "UserIdGroupPairs": [
                        {
                            "VpcId": "vpc-7a20e51f", 
                            "GroupId": "sg-279ab042",
                            "Description": "Access from pcx-b04deed9", 
                            "VpcPeeringConnectionId": "pcx-b04deed9", 
                            "PeeringStatus": "active"
                        }
                    ], 
                    "IpProtocol": "tcp"
                }
            ], 
            "GroupId": "sg-5fa68d3a", 
            "Description": "MySG2"
        }
    ]
  }