**To list DB security groups**

The following ``describe-db-security-groups`` example lists DB security groups. ::

    aws rds describe-db-security-groups

Output::

    {
        "DBSecurityGroups": [
            {
                "OwnerId": "123456789012",
                "DBSecurityGroupName": "default",
                "DBSecurityGroupDescription": "default",
                "EC2SecurityGroups": [],
                "IPRanges": [],
                "DBSecurityGroupArn": "arn:aws:rds:us-west-1:111122223333:secgrp:default"
            },
            {
                "OwnerId": "123456789012",
                "DBSecurityGroupName": "mysecgroup",
                "DBSecurityGroupDescription": "My Test Security Group",
                "VpcId": "vpc-1234567f",
                "EC2SecurityGroups": [],
                "IPRanges": [],
                "DBSecurityGroupArn": "arn:aws:rds:us-west-1:111122223333:secgrp:mysecgroup"
            }
        ]
    }

For more information, see `Listing Available DB Security Groups <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithSecurityGroups.html#USER_WorkingWithSecurityGroups.Listing>`__ in the *Amazon RDS User Guide*.
