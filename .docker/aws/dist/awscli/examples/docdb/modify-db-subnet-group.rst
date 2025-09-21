**To modify an Amazon DocumentDB subnet group**

The following ``modify-db-subnet-group`` example modifies the subnet group ``sample-subnet-group`` by adding the specified subnets and a new description. ::

    aws docdb modify-db-subnet-group \
        --db-subnet-group-name sample-subnet-group \
        --subnet-ids subnet-b3806e8f subnet-53ab3636 subnet-991cb8d0 \
        --db-subnet-group-description "New subnet description"

Output::

    {
        "DBSubnetGroup": {
            "DBSubnetGroupName": "sample-subnet-group",
            "SubnetGroupStatus": "Complete",
            "DBSubnetGroupArn": "arn:aws:rds:us-west-2:123456789012:subgrp:sample-subnet-group",
            "VpcId": "vpc-91280df6",
            "DBSubnetGroupDescription": "New subnet description",
            "Subnets": [
                {
                    "SubnetIdentifier": "subnet-b3806e8f",
                    "SubnetStatus": "Active",
                    "SubnetAvailabilityZone": {
                        "Name": "us-west-2a"
                    }
                },
                {
                    "SubnetIdentifier": "subnet-53ab3636",
                    "SubnetStatus": "Active",
                    "SubnetAvailabilityZone": {
                        "Name": "us-west-2c"
                    }
                },
                {
                    "SubnetIdentifier": "subnet-991cb8d0",
                    "SubnetStatus": "Active",
                    "SubnetAvailabilityZone": {
                        "Name": "us-west-2b"
                    }
                }
            ]
        }
    }

For more information, see `Modifying an Amazon DocumentDB Subnet Group <https://docs.aws.amazon.com/documentdb/latest/developerguide/document-db-subnet-groups.html#document-db-subnet-group-modify>`__ in the *Amazon DocumentDB Developer Guide*.
