**To create a block storage disk**

The following ``create-disk`` example creates a block storage disk ``Disk-1`` in the specified AWS Region and Availability Zone, with 32 GB of storage space. ::

    aws lightsail create-disk \
        --disk-name Disk-1 \
        --availability-zone us-west-2a \
        --size-in-gb 32

Output::

    {
        "operations": [
            {
                "id": "1c85e2ec-86ba-4697-b936-77f4d3dc013a",
                "resourceName": "Disk-1",
                "resourceType": "Disk",
                "createdAt": 1569449220.36,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationType": "CreateDisk",
                "status": "Started",
                "statusChangedAt": 1569449220.588
            }
        ]
    }
