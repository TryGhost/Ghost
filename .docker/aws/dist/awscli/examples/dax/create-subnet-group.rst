**To create a DAX subnet group**

The following ``create-subnet-group`` example creates a subnet group with the specified settings. ::

    aws dax create-subnet-group \
        --subnet-group-name daxSubnetGroup \
        --subnet-ids subnet-11111111 subnet-22222222

Output::

    {
        "SubnetGroup": {
            "SubnetGroupName": "daxSubnetGroup",
            "VpcId": "vpc-05a1fa8e00c325226",
            "Subnets": [
                {
                    "SubnetIdentifier": "subnet-11111111",
                    "SubnetAvailabilityZone": "us-west-2b"
                },
                {
                    "SubnetIdentifier": "subnet-22222222",
                    "SubnetAvailabilityZone": "us-west-2c"
                }
            ]
        }
    }

For more information, see `Step 2: Create a Subnet Group <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.create-cluster.cli.create-subnet-group.html>`__ in the *Amazon DynamoDB Developer Guide*.
