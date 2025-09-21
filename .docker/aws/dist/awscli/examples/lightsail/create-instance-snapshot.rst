**To create a snapshot of an instance**

The following ``create-instance-snapshot`` example creates a snapshot from the specified instance. ::

    aws lightsail create-instance-snapshot \
        --instance-name WordPress-1 \
        --instance-snapshot-name WordPress-Snapshot-1

Output::

    {
        "operations": [
            {
                "id": "4c3db559-9dd0-41e7-89c0-2cb88c19786f",
                "resourceName": "WordPress-Snapshot-1",
                "resourceType": "InstanceSnapshot",
                "createdAt": 1569866438.48,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "WordPress-1",
                "operationType": "CreateInstanceSnapshot",
                "status": "Started",
                "statusChangedAt": 1569866438.48
            },
            {
                "id": "c04fdc45-2981-488c-88b5-d6d2fd759a6a",
                "resourceName": "WordPress-1",
                "resourceType": "Instance",
                "createdAt": 1569866438.48,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "WordPress-Snapshot-1",
                "operationType": "CreateInstanceSnapshot",
                "status": "Started",
                "statusChangedAt": 1569866438.48
            }
        ]
    }
