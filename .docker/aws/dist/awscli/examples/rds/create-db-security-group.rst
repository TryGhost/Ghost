**To create an Amazon RDS DB security group**

The following ``create-db-security-group`` command creates a new Amazon RDS DB security group::

    aws rds create-db-security-group --db-security-group-name mysecgroup --db-security-group-description "My Test Security Group"

In the example, the new DB security group is named ``mysecgroup`` and has a description.

Output::

    {
        "DBSecurityGroup": {
            "OwnerId": "123456789012",
            "DBSecurityGroupName": "mysecgroup",
            "DBSecurityGroupDescription": "My Test Security Group",
            "VpcId": "vpc-a1b2c3d4",
            "EC2SecurityGroups": [],
            "IPRanges": [],
            "DBSecurityGroupArn": "arn:aws:rds:us-west-2:123456789012:secgrp:mysecgroup"
        }
    }
