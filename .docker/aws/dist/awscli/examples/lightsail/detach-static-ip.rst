**To detach a static IP from an instance**

The following ``detach-static-ip`` example detaches static IP ``StaticIp-1`` from any attached instance. ::

    aws lightsail detach-static-ip \
        --static-ip-name StaticIp-1

Output::

    {
        "operations": [
            {
                "id": "2a43d8a3-9f2d-4fe7-bdd0-eEXAMPLE3cf3",
                "resourceName": "StaticIp-1",
                "resourceType": "StaticIp",
                "createdAt": 1571088261.999,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationDetails": "MEAN-1",
                "operationType": "DetachStaticIp",
                "status": "Succeeded",
                "statusChangedAt": 1571088261.999
            },
            {
                "id": "41a7d40c-74e8-4d2e-a837-cEXAMPLEf747",
                "resourceName": "MEAN-1",
                "resourceType": "Instance",
                "createdAt": 1571088262.022,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationDetails": "StaticIp-1",
                "operationType": "DetachStaticIp",
                "status": "Succeeded",
                "statusChangedAt": 1571088262.022
            }
        ]
    }
