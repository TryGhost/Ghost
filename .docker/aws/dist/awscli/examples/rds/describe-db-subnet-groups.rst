**To describe a DB subnet group**

The following ``describe-db-subnet-groups`` example retrieves the details of the specified DB subnet group. ::

    aws rds describe-db-subnet-groups

Output::

    {
        "DBSubnetGroups": [
            {
                "DBSubnetGroupName": "mydbsubnetgroup",
                "DBSubnetGroupDescription": "My DB Subnet Group",
                "VpcId": "vpc-971c12ee",
                "SubnetGroupStatus": "Complete",
                "Subnets": [
                    {
                        "SubnetIdentifier": "subnet-d8c8e7f4",
                        "SubnetAvailabilityZone": {
                            "Name": "us-east-1a"
                        },
                        "SubnetStatus": "Active"
                    },
                    {
                        "SubnetIdentifier": "subnet-718fdc7d",
                        "SubnetAvailabilityZone": {
                            "Name": "us-east-1f"
                        },
                        "SubnetStatus": "Active"
                    },
                    {
                        "SubnetIdentifier": "subnet-cbc8e7e7",
                        "SubnetAvailabilityZone": {
                            "Name": "us-east-1a"
                        },
                        "SubnetStatus": "Active"
                    },
                    {
                        "SubnetIdentifier": "subnet-0ccde220",
                        "SubnetAvailabilityZone": {
                            "Name": "us-east-1a"
                        },
                        "SubnetStatus": "Active"
                    }
                ],
                "DBSubnetGroupArn": "arn:aws:rds:us-east-1:123456789012:subgrp:mydbsubnetgroup"
            }
        ]
    }

For more information, see `Amazon Virtual Private Cloud VPCs and Amazon RDS <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.html>`__ in the *Amazon RDS User Guide*.
