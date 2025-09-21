**To delete a block storage disk**

The following ``delete-disk`` example deletes the specified block storage disk. ::

    aws lightsail delete-disk \
        --disk-name Disk-1

Output::

    {
        "operations": [
            {
                "id": "6378c70f-4d75-4f7a-ab66-730fca0bb2fc",
                "resourceName": "Disk-1",
                "resourceType": "Disk",
                "createdAt": 1569872887.864,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationType": "DeleteDisk",
                "status": "Succeeded",
                "statusChangedAt": 1569872887.864
            }
        ]
    }
