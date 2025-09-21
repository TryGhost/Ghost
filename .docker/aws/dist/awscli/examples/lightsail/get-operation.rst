**To get information about a single operation**

The following ``get-operation`` example displays details about the specified operation. ::

    aws lightsail get-operation \
        --operation-id e5700e8a-daf2-4b49-bc01-3EXAMPLE910a


Output::

    {
        "operation": {
            "id": "e5700e8a-daf2-4b49-bc01-3EXAMPLE910a",
            "resourceName": "Instance-1",
            "resourceType": "Instance",
            "createdAt": 1571679872.404,
            "location": {
                "availabilityZone": "us-west-2a",
                "regionName": "us-west-2"
            },
            "isTerminal": true,
            "operationType": "CreateInstance",
            "status": "Succeeded",
            "statusChangedAt": 1571679890.304
        }
    }
