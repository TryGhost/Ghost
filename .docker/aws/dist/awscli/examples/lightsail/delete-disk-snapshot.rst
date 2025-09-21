**To delete a snapshot of a block storage disk**

The following ``delete-disk-snapshot`` example deletes the specified snapshot of a block storage disk ::

    aws lightsail delete-disk-snapshot \
        --disk-snapshot-name DiskSnapshot-1

Output::

    {
        "operations": [
            {
                "id": "d1e5766d-b81e-4595-ad5d-02afbccfcd5d",
                "resourceName": "DiskSnapshot-1",
                "resourceType": "DiskSnapshot",
                "createdAt": 1569873552.79,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationType": "DeleteDiskSnapshot",
                "status": "Succeeded",
                "statusChangedAt": 1569873552.79
            }
        ]
    }
