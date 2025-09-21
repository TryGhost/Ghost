**To disassociate an IAM instance profile**

This example disassociates an IAM instance profile with the association ID ``iip-assoc-05020b59952902f5f``.

Command::

  aws ec2 disassociate-iam-instance-profile --association-id iip-assoc-05020b59952902f5f

Output::

  {
    "IamInstanceProfileAssociation": {
        "InstanceId": "i-123456789abcde123",
        "State": "disassociating",
        "AssociationId": "iip-assoc-05020b59952902f5f",
        "IamInstanceProfile": {
            "Id": "AIPAI5IVIHMFFYY2DKV5Y",
            "Arn": "arn:aws:iam::123456789012:instance-profile/admin-role"
        }
    }
  }
