**To delete a subnet group**

The following ``delete-subnet-group`` example deletes a subnet. ::

    aws memorydb delete-subnet-group \
        --subnet-group-name mysubnetgroup

Output::

    {
        "SubnetGroup": {
            "Name": "mysubnetgroup",
            "Description": "my subnet group",
            "VpcId": "vpc-86xxxx4fc",
            "Subnets": [
                {
                    "Identifier": "subnet-56xxx61b",
                    "AvailabilityZone": {
                        "Name": "us-east-1a"
                    }
                }
            ],
            "ARN": "arn:aws:memorydb:us-east-1:491658xxxxxx:subnetgroup/mysubnetgroup"
        }
    }

For more information, see `Deleting a subnet group <https://docs.aws.amazon.com/memorydb/latest/devguide/subnetgroups.deleting.html>`__ in the *MemoryDB User Guide*.
