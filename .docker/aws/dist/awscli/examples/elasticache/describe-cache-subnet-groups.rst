**To describe cache subnet groups**

The following ``describe-cache-subnet-groups`` example returns a list of subnet groups. ::

    aws elasticache describe-cache-subnet-groups

Output::

    {
        "CacheSubnetGroups": [
            {
                "CacheSubnetGroupName": "default",
                "CacheSubnetGroupDescription": "Default CacheSubnetGroup",
                "VpcId": "vpc-a3e97cdb",
                "Subnets": [
                    {
                        "SubnetIdentifier": "subnet-8d4bacf5",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2b"
                        }
                    },
                    {
                        "SubnetIdentifier": "subnet-dde21380",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2c"
                        }
                    },
                    {
                        "SubnetIdentifier": "subnet-6485ec4f",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2d"
                        }
                    },
                    {
                        "SubnetIdentifier": "subnet-b4ebebff",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2a"
                        }
                    }
                ]
            },
            {
                "CacheSubnetGroupName": "kxkxk",
                "CacheSubnetGroupDescription": "mygroup",
                "VpcId": "vpc-a3e97cdb",
                "Subnets": [
                    {
                        "SubnetIdentifier": "subnet-b4ebebff",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2a"
                        }
                    }
                ]
            },
            {
                "CacheSubnetGroupName": "test",
                "CacheSubnetGroupDescription": "test",
                "VpcId": "vpc-a3e97cdb",
                "Subnets": [
                    {
                        "SubnetIdentifier": "subnet-b4ebebff",
                        "SubnetAvailabilityZone": {
                            "Name": "us-west-2a"
                        }
                    }
                ]
            }
        ]
    }

For more information, see `Subnets and Subnet Groups <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/SubnetGroups.html>`__ in the *Elasticache User Guide* or `Subnets and Subnet Groups <https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/SubnetGroups.html>`__ in the *ElastiCache for Memcached User Guide*.