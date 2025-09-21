**To get information about a static IP**

The following ``get-static-ip`` example displays details about the specified static IP. ::

    aws lightsail get-static-ip \
        --static-ip-name StaticIp-1

Output::

    {
        "staticIp": {
            "name": "StaticIp-1",
            "arn": "arn:aws:lightsail:us-west-2:111122223333:StaticIp/2257cd76-1f0e-4ac0-82e2-2EXAMPLE23ad",
            "supportCode": "6EXAMPLE3362/192.0.2.0",
            "createdAt": 1571071325.076,
            "location": {
                "availabilityZone": "all",
                "regionName": "us-west-2"
            },
            "resourceType": "StaticIp",
            "ipAddress": "192.0.2.0",
            "isAttached": false
        }
    }
