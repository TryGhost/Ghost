**To associate an AWS Identity and Access Management (IAM) role with a DB instance**

The following ``authorize-db-security-group-ingress`` example configures the default security group with an ingress rule for the CIDR IP range 192.0.2.0/24. ::

    aws rds authorize-db-security-group-ingress \
        --db-security-group-name default \
        --cidrip 192.0.2.0/24

Output::

    {
        "DBSecurityGroup": {
            "OwnerId": "123456789012",
            "DBSecurityGroupName": "default",
            "DBSecurityGroupDescription": "default",
            "EC2SecurityGroups": [],
            "IPRanges": [
                {
                    "Status": "authorizing",
                    "CIDRIP": "192.0.2.0/24"
                }
            ],
            "DBSecurityGroupArn": "arn:aws:rds:us-east-1:111122223333:secgrp:default"
        }
    }

For more information, see `Authorizing Network Access to a DB Security Group from an IP Range <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithSecurityGroups.html#USER_WorkingWithSecurityGroups.Authorizing>`__ in the *Amazon RDS User Guide*.
