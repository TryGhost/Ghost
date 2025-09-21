**To get all operations for a resource**

The following ``get-operations-for-resource`` example displays details about all operations for the specified resource. ::

    aws lightsail get-operations-for-resource \
        --resource-name LoadBalancer-1

Output::

    {
        "operations": [
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
                "operationDetails": "MEAN-1",
                "operationType": "DetachInstancesFromLoadBalancer",
                "status": "Succeeded",
                "statusChangedAt": 1571679087.57
            },
            {
                "id": "2d742a18-0e7f-48c8-9705-3EXAMPLEf98a",
                "resourceName": "LoadBalancer-1",
                "resourceType": "LoadBalancer",
                "createdAt": 1571678782.784,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationDetails": "MEAN-1",
                "operationType": "AttachInstancesToLoadBalancer",
                "status": "Succeeded",
                "statusChangedAt": 1571678798.465
            },
            {
                "id": "6c700fcc-4246-40ab-952b-1EXAMPLEdac2",
                "resourceName": "LoadBalancer-1",
                "resourceType": "LoadBalancer",
                "createdAt": 1571678775.297,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationDetails": "MEAN-3",
                "operationType": "AttachInstancesToLoadBalancer",
                "status": "Succeeded",
                "statusChangedAt": 1571678842.806
            },
            ...
            }
        ]
    }
