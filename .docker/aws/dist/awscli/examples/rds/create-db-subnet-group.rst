**To create a DB subnet group**

The following ``create-db-subnet-group`` example creates a DB subnet group called ``mysubnetgroup`` using existing subnets. ::

    aws rds create-db-subnet-group \
        --db-subnet-group-name mysubnetgroup \
        --db-subnet-group-description "test DB subnet group" \
        --subnet-ids '["subnet-0a1dc4e1a6f123456","subnet-070dd7ecb3aaaaaaa","subnet-00f5b198bc0abcdef"]'

Output::

    {
        "DBSubnetGroup": {
            "DBSubnetGroupName": "mysubnetgroup",
            "DBSubnetGroupDescription": "test DB subnet group",
            "VpcId": "vpc-0f08e7610a1b2c3d4",
            "SubnetGroupStatus": "Complete",
            "Subnets": [
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
            "DBSubnetGroupArn": "arn:aws:rds:us-west-2:0123456789012:subgrp:mysubnetgroup"
        }
    }

For more information, see `Creating a DB Instance in a VPC <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html#USER_VPC.InstanceInVPC>`__ in the *Amazon RDS User Guide*.
