**To describe orderable replication instances**

The following ``describe-orderable-replication-instances`` example lists replication instance types that you can order. ::

    aws dms describe-orderable-replication-instances

Output::

    {
        "OrderableReplicationInstances": [
            {
                "EngineVersion": "3.3.2",
                "ReplicationInstanceClass": "dms.c4.2xlarge",
                "StorageType": "gp2",
                "MinAllocatedStorage": 5,
                "MaxAllocatedStorage": 6144,
                "DefaultAllocatedStorage": 100,
                "IncludedAllocatedStorage": 100,
                "AvailabilityZones": [
                    "us-east-1a",
                    "us-east-1b",
                    "us-east-1c",
                    "us-east-1d",
                    "us-east-1e",
                    "us-east-1f"
                ]
            },
            {
                "EngineVersion": "3.3.2",
                "ReplicationInstanceClass": "dms.c4.4xlarge",
                "StorageType": "gp2",
                "MinAllocatedStorage": 5,
                "MaxAllocatedStorage": 6144,
                "DefaultAllocatedStorage": 100,
                "IncludedAllocatedStorage": 100,
                "AvailabilityZones": [
                    "us-east-1a",
                    "us-east-1b",
                    "us-east-1c",
                    "us-east-1d",
                    "us-east-1e",
                    "us-east-1f"
                ]
            },

            ...remaining output omitted...

        }

For more information, see `Working with an AWS DMS Replication Instance <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.html>`__ in the *AWS Database Migration Service User Guide*.
