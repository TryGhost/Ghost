**To modify a subnet group**

The following ``modify-replication-subnet-group`` example changes the lists of subnets associated with a subnet group. ::

    aws dms modify-replication-subnet-group \
        --replication-subnet-group-identifier my-subnet-group \
        --subnet-id subnet-da327bf6 subnet-bac383e0

Output::

    {   
        "ReplicationSubnetGroup": {
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
                }
            ]
        }
    }

For more information, see `Setting Up a Network for a Replication Instance <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.VPC.html>`__ in the *AWS Database Migration Service User Guide*.
