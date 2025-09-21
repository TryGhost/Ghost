**To display the available subnet groups**

The following ``describe-replication-subnet-groups`` example lists the available subnet groups. ::

    aws dms describe-replication-subnet-groups \
        --filter "Name=replication-subnet-group-id,Values=my-subnet-group"

Output::

    {
        "ReplicationSubnetGroups": [
            {
                "ReplicationSubnetGroupIdentifier": "my-subnet-group",
                "ReplicationSubnetGroupDescription": "my subnet group",
                "VpcId": "vpc-136a4c6a",
                "SubnetGroupStatus": "Complete",
                "Subnets": [
                    {
                        "SubnetIdentifier": "subnet-da327bf6",
                        "SubnetAvailabilityZone": {
                            "Name": "us-east-1a"
                        },
                        "SubnetStatus": "Active"
                    },
                    {
                        "SubnetIdentifier": "subnet-bac383e0",
                        "SubnetAvailabilityZone": {
                            "Name": "us-east-1c"
                        },
                        "SubnetStatus": "Active"
                    },
                    {
                        "SubnetIdentifier": "subnet-d7c825e8",
                        "SubnetAvailabilityZone": {
                            "Name": "us-east-1e"
                        },
                        "SubnetStatus": "Active"
                    }
                ]
            }
        ]
    }

For more information, see `Setting Up a Network for a Replication Instance <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.VPC.html>`__ in the *AWS Database Migration Service User Guide*.
