**To get information about all operations**

The following ``get-operations`` example displays details about all of the operations in the configured AWS Region. ::

    aws lightsail get-operations

Output::

    {
        "operations": [
            {
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
            },
            {
                "id": "701a3339-930e-4914-a9f9-7EXAMPLE68d7",
                "resourceName": "WordPress-1",
                "resourceType": "Instance",
                "createdAt": 1571678786.072,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationDetails": "LoadBalancer-1",
                "operationType": "DetachInstancesFromLoadBalancer",
                "status": "Succeeded",
                "statusChangedAt": 1571679086.399
            },
            {
                "id": "e2973046-43f8-4252-a4b4-9EXAMPLE69ce",
                "resourceName": "LoadBalancer-1",
                "resourceType": "LoadBalancer",
                "createdAt": 1571678786.071,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationDetails": "WordPress-1",
                "operationType": "DetachInstancesFromLoadBalancer",
                "status": "Succeeded",
                "statusChangedAt": 1571679087.57
            },
            ...
            }
        ]
    }
