**To start an instance**

The following ``start-instance`` example starts the specified instance. ::

    aws lightsail start-instance \
        --instance-name WordPress-1

Output::

    {
        "operations": [
            {
                "id": "f88d2a93-7cea-4165-afce-2d688cb18f23",
                "resourceName": "WordPress-1",
                "resourceType": "Instance",
                "createdAt": 1571695583.463,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationType": "StartInstance",
                "status": "Started",
                "statusChangedAt": 1571695583.463
            }
        ]
    }
