**To create a subnet group**

The following ``create-subnet-group`` example creates a subnet group. ::

    aws memorydb create-subnet-group \
        --subnet-group-name mysubnetgroup \
        --description "my subnet group" \
        --subnet-ids subnet-5623xxxx

Output::

    {
        "SubnetGroup": {
            "Name": "mysubnetgroup",
            "Description": "my subnet group",
            "VpcId": "vpc-86257xxx",
            "Subnets": [
                {
                    "Identifier": "subnet-5623xxxx",
                    "AvailabilityZone": {
                        "Name": "us-east-1a"
                    }
                }
            ],
            "ARN": "arn:aws:memorydb:us-east-1:491658xxxxxx:subnetgroup/mysubnetgroup"
        }
    }

For more information, see `Creating a subnet group <https://docs.aws.amazon.com/memorydb/latest/devguide/subnetgroups.creating.html>`__ in the *MemoryDB User Guide*.
