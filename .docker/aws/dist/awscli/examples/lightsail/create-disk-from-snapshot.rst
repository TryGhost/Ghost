**To create a create a disk from a disk snapshot**

The following ``create-disk-from-snapshot`` example creates a block storage disk named ``Disk-2`` from the specified block storage disk snapshot. The disk is created in the specified AWS Region and Availability Zone, with 32 GB of storage space. ::

    aws lightsail create-disk-from-snapshot \
        --disk-name Disk-2 \
        --disk-snapshot-name Disk-1-1566839161 \
        --availability-zone us-west-2a \
        --size-in-gb 32

Output::

    {
        "operations": [
            {
                "id": "d42b605d-5ef1-4b4a-8791-7a3e8b66b5e7",
                "resourceName": "Disk-2",
                "resourceType": "Disk",
                "createdAt": 1569624941.471,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationType": "CreateDiskFromSnapshot",
                "status": "Started",
                "statusChangedAt": 1569624941.791
            }
        ]
    }

For more information, see `Creating a block storage disk from a snapshot in Amazon Lightsail <https://lightsail.aws.amazon.com/ls/docs/en_us/articles/create-new-block-storage-disk-from-snapshot>`__ in the *Lightsail Developer Guide*.
