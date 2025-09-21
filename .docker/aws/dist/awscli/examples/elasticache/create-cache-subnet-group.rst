**To create a cache subnet group**

The following ``create-cache-subnet-group`` example creates a new cache subnet group. ::

    aws elasticache create-cache-subnet-group \
        --cache-subnet-group-name "mygroup" \
        --cache-subnet-group-description "my subnet group" \
        --subnet-ids "subnet-xxxxec4f" 

Output::

    {
        "CacheSubnetGroup": {
            "CacheSubnetGroupName": "mygroup",
            "CacheSubnetGroupDescription": "my subnet group",
            "VpcId": "vpc-a3e97cdb",
            "Subnets": [
                {
                    "SubnetIdentifier": "subnet-xxxxec4f",
                    "SubnetAvailabilityZone": {
                        "Name": "us-west-2d"
                    }
                }
            ]
        }
    }

For more information, see `Creating a Cache Subnet Group <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/VPCs.CreatingSubnetGroup.html>`__ in the *Elasticache User Guide*.
