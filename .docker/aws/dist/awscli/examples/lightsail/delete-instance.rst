**To delete an instance**

The following ``delete-instance`` example deletes the specified instance. ::

    aws lightsail delete-instance \
        --instance-name WordPress-1

Output::

    {
        "operations": [
            {
                "id": "d77345a3-8f80-4d2e-b47d-aaa622718df2",
                "resourceName": "Disk-1",
                "resourceType": "Disk",
                "createdAt": 1569874357.469,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "WordPress-1",
                "operationType": "DetachDisk",
                "status": "Started",
                "statusChangedAt": 1569874357.469
            },
            {
                "id": "708fa606-2bfd-4e48-a2c1-0b856585b5b1",
                "resourceName": "WordPress-1",
                "resourceType": "Instance",
                "createdAt": 1569874357.465,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "Disk-1",
                "operationType": "DetachDisk",
                "status": "Started",
                "statusChangedAt": 1569874357.465
            },
            {
                "id": "3187e823-8acb-405d-b098-fad5ceb17bec",
                "resourceName": "WordPress-1",
                "resourceType": "Instance",
                "createdAt": 1569874357.829,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationType": "DeleteInstance",
                "status": "Succeeded",
                "statusChangedAt": 1569874357.829
            }
        ]
    }
