**To create a static IP**

The following ``allocate-static-ip`` example creates the specified static IP, which can be attached to an instance. ::

    aws lightsail allocate-static-ip \
        --static-ip-name StaticIp-1

Output::

    {
        "operations": [
            {
                "id": "b5d06d13-2f19-4683-889f-dEXAMPLEed79",
                "resourceName": "StaticIp-1",
                "resourceType": "StaticIp",
                "createdAt": 1571071325.076,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationType": "AllocateStaticIp",
                "status": "Succeeded",
                "statusChangedAt": 1571071325.274
            }
        ]
    }
