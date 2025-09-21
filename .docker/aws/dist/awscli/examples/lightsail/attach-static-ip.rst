**To attach a static IP to an instance**

The following ``attach-static-ip`` example attaches static IP ``StaticIp-1`` to instance ``MEAN-1``. ::

    aws lightsail attach-static-ip \
        --static-ip-name StaticIp-1 \
        --instance-name MEAN-1

Output::

    {
        "operations": [
            {
                "id": "45e6fa13-4808-4b8d-9292-bEXAMPLE20b2",
                "resourceName": "StaticIp-1",
                "resourceType": "StaticIp",
                "createdAt": 1571072569.375,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationDetails": "MEAN-1",
                "operationType": "AttachStaticIp",
                "status": "Succeeded",
                "statusChangedAt": 1571072569.375
            },
            {
                "id": "9ee09a17-863c-4e51-8a6d-3EXAMPLE5475",
                "resourceName": "MEAN-1",
                "resourceType": "Instance",
                "createdAt": 1571072569.376,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationDetails": "StaticIp-1",
                "operationType": "AttachStaticIp",
                "status": "Succeeded",
                "statusChangedAt": 1571072569.376
            }
        ]
    }
