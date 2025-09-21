**To delete a static IP**

The following ``release-static-ip`` example deletes the specified static IP. ::

    aws lightsail release-static-ip \
        --static-ip-name StaticIp-1

Output::

    {
        "operations": [
            {
                "id": "e374c002-dc6d-4c7f-919f-2EXAMPLE13ce",
                "resourceName": "StaticIp-1",
                "resourceType": "StaticIp",
                "createdAt": 1571694962.003,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationType": "ReleaseStaticIp",
                "status": "Succeeded",
                "statusChangedAt": 1571694962.003
            }
        ]
    }
