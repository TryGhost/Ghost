**To describe subnet groups defined in DAX**

The following ``describe-subnet-groups`` example retrieves details for the subnet groups defined in DAX. ::

    aws dax describe-subnet-groups

Output::

    {
        "SubnetGroups": [
            {
                "SubnetGroupName": "default",
                "Description": "Default CacheSubnetGroup",
                "VpcId": "vpc-ee70a196",
                "Subnets": [
                    {
                        "SubnetIdentifier": "subnet-874953af",
                        "SubnetAvailabilityZone": "us-west-2d"
                    },
                    {
                        "SubnetIdentifier": "subnet-bd3d1fc4",
                        "SubnetAvailabilityZone": "us-west-2a"
                    },
                    {
                        "SubnetIdentifier": "subnet-72c2ff28",
                        "SubnetAvailabilityZone": "us-west-2c"
                    },
                    {
                        "SubnetIdentifier": "subnet-09e6aa42",
                        "SubnetAvailabilityZone": "us-west-2b"
                    }
                ]
            }
        ]
    }

For more information, see `Managing DAX Clusters <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.concepts.cluster.html#DAX.concepts.cluster.security>`__ in the *Amazon DynamoDB Developer Guide*.
