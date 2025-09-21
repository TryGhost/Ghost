**To reboot an instance**

The following ``reboot-instance`` example reboots the specified instance. ::

    aws lightsail reboot-instance \
        --instance-name MEAN-1

Output::

    {
        "operations": [
            {
                "id": "2b679f1c-8b71-4bb4-8e97-8EXAMPLEed93",
                "resourceName": "MEAN-1",
                "resourceType": "Instance",
                "createdAt": 1571694445.49,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationDetails": "",
                "operationType": "RebootInstance",
                "status": "Succeeded",
                "statusChangedAt": 1571694445.49
            }
        ]
    }
