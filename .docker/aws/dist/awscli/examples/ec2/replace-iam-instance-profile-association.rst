**To replace an IAM instance profile for an instance**

This example replaces the IAM instance profile represented by the association ``iip-assoc-060bae234aac2e7fa`` with the IAM instance profile named ``AdminRole``. ::

    aws ec2 replace-iam-instance-profile-association \
        --iam-instance-profile Name=AdminRole \
        --association-id iip-assoc-060bae234aac2e7fa

Output::

    {
        "IamInstanceProfileAssociation": {
            "InstanceId": "i-087711ddaf98f9489", 
            "State": "associating", 
            "AssociationId": "iip-assoc-0b215292fab192820", 
            "IamInstanceProfile": {
                "Id": "AIPAJLNLDX3AMYZNWYYAY", 
                "Arn": "arn:aws:iam::123456789012:instance-profile/AdminRole"
            }
        }
    }
