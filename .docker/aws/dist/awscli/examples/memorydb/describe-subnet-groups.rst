**To return a list of subnet groups**

The following `describe-subnet-groups`` returns a list of subnet groups. ::

    aws memorydb describe-subnet-groups

Output ::

    {
        "SubnetGroups": [
            {
                "Name": "my-sg",
                "Description": "pat-sg",
                "VpcId": "vpc-86xxx4fc",
                "Subnets": [
                    {
                        "Identifier": "subnet-faxx84a6",
                        "AvailabilityZone": {
                            "Name": "us-east-1b"
                        }
                    },
                    {
                        "Identifier": "subnet-56xxf61b",
                        "AvailabilityZone": {
                            "Name": "us-east-1a"
                        }
                    }
                ],
                "ARN": "arn:aws:memorydb:us-east-1:49165xxxxxx:subnetgroup/my-sg"
            }
        ]
    }

For more information, see `Subnets and subnet groups <https://docs.aws.amazon.com/memorydb/latest/devguide/subnetgroups.html>`__ in the *MemoryDB User Guide*.
