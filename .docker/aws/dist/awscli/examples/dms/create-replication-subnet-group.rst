**To create a subnet group**

The following ``create-replication-subnet-group`` example creates a group consisting of 3 subnets. ::

    aws dms create-replication-subnet-group \
        --replication-subnet-group-identifier my-subnet-group \
        --replication-subnet-group-description "my subnet group" \
        --subnet-ids subnet-da327bf6 subnet-bac383e0 subnet-d7c825e8

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
    }

For more information, see `Setting Up a Network for a Replication Instance <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.VPC.html>`__ in the *AWS Database Migration Service User Guide*.
