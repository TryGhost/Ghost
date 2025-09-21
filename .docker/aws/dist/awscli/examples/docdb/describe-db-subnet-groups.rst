**To retrieve a list of Amazon DocumentDB subnet descriptions**

The following ``describe-db-subnet-groups`` example describes details for the Amazon DocumentDB subnet named ``default``. ::

    aws docdb describe-db-subnet-groups \
        --db-subnet-group-name default

Output::

    {
        "DBSubnetGroups": [
            {
                "VpcId": "vpc-91280df6",
                "DBSubnetGroupArn": "arn:aws:rds:us-west-2:123456789012:subgrp:default",
                "Subnets": [
                    {
                        "SubnetIdentifier": "subnet-4e26d263",
                        "SubnetStatus": "Active",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2a"
                        }
                    },
                    {
                        "SubnetIdentifier": "subnet-afc329f4",
                        "SubnetStatus": "Active",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2c"
                        }
                    },
                    {
                        "SubnetIdentifier": "subnet-53ab3636",
                        "SubnetStatus": "Active",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2d"
                        }
                    },
                    {
                        "SubnetIdentifier": "subnet-991cb8d0",
                        "SubnetStatus": "Active",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2b"
                        }
                    }
                ],
                "DBSubnetGroupName": "default",
                "SubnetGroupStatus": "Complete",
                "DBSubnetGroupDescription": "default"
            }
        ]
    }


For more information, see `Describing Subnet Groups <https://docs.aws.amazon.com/documentdb/latest/developerguide/ document-db-subnet-groups.html#document-db-subnet-groups-describe>`__ in the *Amazon DocumentDB Developer Guide*.
