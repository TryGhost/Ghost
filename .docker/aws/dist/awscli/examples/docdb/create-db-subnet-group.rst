**To create an Amazon DocumentDB subnet group**

The following ``create-db-subnet-group`` example creates an Amazon DocumentDB subnet group named ``sample-subnet-group``. ::

    aws docdb create-db-subnet-group \
        --db-subnet-group-description "a sample subnet group" \
        --db-subnet-group-name sample-subnet-group \
        --subnet-ids "subnet-29ab1025" "subnet-991cb8d0" "subnet-53ab3636"

Output::

    {
        "DBSubnetGroup": {
            "SubnetGroupStatus": "Complete",
            "DBSubnetGroupName": "sample-subnet-group",
            "DBSubnetGroupDescription": "a sample subnet group",
            "VpcId": "vpc-91280df6",
            "DBSubnetGroupArn": "arn:aws:rds:us-west-2:123456789012:subgrp:sample-subnet-group",
            "Subnets": [
                {
                    "SubnetStatus": "Active",
                    "SubnetIdentifier": "subnet-53ab3636",
                    "SubnetAvailabilityZone": {
                        "Name": "us-west-2d"
                    }
                },
                {
                    "SubnetStatus": "Active",
                    "SubnetIdentifier": "subnet-991cb8d0",
                    "SubnetAvailabilityZone": {
                        "Name": "us-west-2b"
                    }
                },
                {
                    "SubnetStatus": "Active",
                    "SubnetIdentifier": "subnet-29ab1025",
                    "SubnetAvailabilityZone": {
                        "Name": "us-west-2c"
                    }
                }
            ]
        }
    }


For more information, see `Creating an Amazon DocumentDB Subnet Group <https://docs.aws.amazon.com/documentdb/latest/developerguide/document-db-subnet-groups.html#document-db-subnet-group-create>`__ in the *Amazon DocumentDB Developer Guide*.
