**To modify a cache subnet group**

The following ``modify-cache-subnet-group`` example modifies the specified cache subnet group. ::

    aws elasticache modify-cache-subnet-group \
        --cache-subnet-group-name kxkxk \
        --cache-subnet-group-description "mygroup"

Output::

    {
        "CacheSubnetGroup": {
            "CacheSubnetGroupName": "kxkxk",
            "CacheSubnetGroupDescription": "mygroup",
            "VpcId": "vpc-xxxxcdb",
            "Subnets": [
                {
                    "SubnetIdentifier": "subnet-xxxxbff",
                    "SubnetAvailabilityZone": {
                        "Name": "us-west-2a"
                    }
                }
            ]
        }
    }

For more information, see `Modifying a Subnet Group <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/SubnetGroups.Modifying.html>`__ in the *Elasticache User Guide*.
