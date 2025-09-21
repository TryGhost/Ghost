**To describe security group references**

This example describes the security group references for ``sg-bbbb2222``. The response indicates that security group ``sg-bbbb2222`` is being referenced by a security group in VPC ``vpc-aaaaaaaa``.

Command::

  aws ec2 describe-security-group-references --group-id sg-bbbbb22222

Output::

  {    
    "SecurityGroupsReferenceSet": [
      {
        "ReferencingVpcId": "vpc-aaaaaaaa ",
        "GroupId": "sg-bbbbb22222", 
        "VpcPeeringConnectionId": "pcx-b04deed9"      
      }   
    ]
  }