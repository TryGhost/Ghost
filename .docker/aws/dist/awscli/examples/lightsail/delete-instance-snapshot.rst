**title**

The following ``delete-instance-snapshot`` example deletes the specified snapshot of an instance. ::

    aws lightsail delete-instance-snapshot \
        --instance-snapshot-name WordPress-1-Snapshot-1

Output::

    {
        "operations": [
            {
                "id": "14dad182-976a-46c6-bfd4-9480482bf0ea",
                "resourceName": "WordPress-1-Snapshot-1",
                "resourceType": "InstanceSnapshot",
                "createdAt": 1569874524.562,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationType": "DeleteInstanceSnapshot",
                "status": "Succeeded",
                "statusChangedAt": 1569874524.562
            }
        ]
    }
