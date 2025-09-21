**To modify a DB subnet group**

The following ``modify-db-subnet-group`` example adds a subnet with the ID ``subnet-08e41f9e230222222`` to the DB subnet group named ``mysubnetgroup``. To keep the existing subnets in the subnet group, include their IDs as values in the ``--subnet-ids`` option. Make sure to have subnets with at least two different Availability Zones in the DB subnet group. ::

    aws rds modify-db-subnet-group \
        --db-subnet-group-name mysubnetgroup \
        --subnet-ids '["subnet-0a1dc4e1a6f123456","subnet-070dd7ecb3aaaaaaa","subnet-00f5b198bc0abcdef","subnet-08e41f9e230222222"]'

Output::

    {
        "DBSubnetGroup": {
            "DBSubnetGroupName": "mysubnetgroup",
            "DBSubnetGroupDescription": "test DB subnet group",
            "VpcId": "vpc-0f08e7610a1b2c3d4",
            "SubnetGroupStatus": "Complete",
            "Subnets": [
                {
                    "SubnetIdentifier": "subnet-08e41f9e230222222",
                    "SubnetAvailabilityZone": {
                        "Name": "us-west-2a"
                    },
                    "SubnetStatus": "Active"
                },
                {
                    "SubnetIdentifier": "subnet-070dd7ecb3aaaaaaa",
                    "SubnetAvailabilityZone": {
                        "Name": "us-west-2b"
                    },
                    "SubnetStatus": "Active"
                },
                {
                    "SubnetIdentifier": "subnet-00f5b198bc0abcdef",
                    "SubnetAvailabilityZone": {
                        "Name": "us-west-2d"
                    },
                    "SubnetStatus": "Active"
                },
                {
                    "SubnetIdentifier": "subnet-0a1dc4e1a6f123456",
                    "SubnetAvailabilityZone": {
                        "Name": "us-west-2b"
                    },
                    "SubnetStatus": "Active"
                }
            ],
            "DBSubnetGroupArn": "arn:aws:rds:us-west-2:534026745191:subgrp:mysubnetgroup"
        }
    }

For more information, see `Step 3: Create a DB Subnet Group <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html#USER_VPC.CreateDBSubnetGroup>`__ in the *Amazon RDS User Guide*.
