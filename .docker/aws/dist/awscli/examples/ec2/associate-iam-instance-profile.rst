**To associate an IAM instance profile with an instance**

This example associates an IAM instance profile named ``admin-role`` with instance ``i-123456789abcde123``.

Command::

  aws ec2 associate-iam-instance-profile --instance-id i-123456789abcde123 --iam-instance-profile Name=admin-role

Output::

  {
    "IamInstanceProfileAssociation": {
        "InstanceId": "i-123456789abcde123",
        "State": "associating",
        "AssociationId": "iip-assoc-0e7736511a163c209",
        "IamInstanceProfile": {
            "Id": "AIPAJBLK7RKJKWDXVHIEC",
            "Arn": "arn:aws:iam::123456789012:instance-profile/admin-role"
        }
    }
  }
