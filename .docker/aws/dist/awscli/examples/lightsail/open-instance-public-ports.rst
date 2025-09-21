**To open firewall ports for an instance**

The following ``open-instance-public-ports`` example opens TCP port 22 on the specified instance. ::

    aws lightsail open-instance-public-ports \
        --instance-name MEAN-2 \
        --port-info fromPort=22,protocol=TCP,toPort=22

Output::

    {
        "operation": {
            "id": "719744f0-a022-46f2-9f11-6EXAMPLE4642",
            "resourceName": "MEAN-2",
            "resourceType": "Instance",
            "createdAt": 1571072906.849,
            "location": {
                "availabilityZone": "us-west-2a",
                "regionName": "us-west-2"
            },
            "isTerminal": true,
            "operationDetails": "22/tcp",
            "operationType": "OpenInstancePublicPorts",
            "status": "Succeeded",
            "statusChangedAt": 1571072906.849
        }
    }
