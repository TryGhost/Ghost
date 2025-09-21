**To attach instances to a load balancer**

The following ``attach-instances-to-load-balancer`` example attaches instances ``MEAN-1``, ``MEAN-2``, and ``MEAN-3`` to the load balancer ``LoadBalancer-1``. ::

    aws lightsail attach-instances-to-load-balancer \
        --instance-names {"MEAN-1","MEAN-2","MEAN-3"} \
        --load-balancer-name LoadBalancer-1

Output::

    {
        "operations": [
            {
                "id": "8055d19d-abb2-40b9-b527-1EXAMPLE3c7b",
                "resourceName": "LoadBalancer-1",
                "resourceType": "LoadBalancer",
                "createdAt": 1571071699.892,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "MEAN-2",
                "operationType": "AttachInstancesToLoadBalancer",
                "status": "Started",
                "statusChangedAt": 1571071699.892
            },
            {
                "id": "c35048eb-8538-456a-a118-0EXAMPLEfb73",
                "resourceName": "MEAN-2",
                "resourceType": "Instance",
                "createdAt": 1571071699.887,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "LoadBalancer-1",
                "operationType": "AttachInstancesToLoadBalancer",
                "status": "Started",
                "statusChangedAt": 1571071699.887
            },
            {
                "id": "910d09e0-adc5-4372-bc2e-0EXAMPLEd891",
                "resourceName": "LoadBalancer-1",
                "resourceType": "LoadBalancer",
                "createdAt": 1571071699.882,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "MEAN-3",
                "operationType": "AttachInstancesToLoadBalancer",
                "status": "Started",
                "statusChangedAt": 1571071699.882
            },
            {
                "id": "178b18ac-43e8-478c-9bed-1EXAMPLE4755",
                "resourceName": "MEAN-3",
                "resourceType": "Instance",
                "createdAt": 1571071699.901,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "LoadBalancer-1",
                "operationType": "AttachInstancesToLoadBalancer",
                "status": "Started",
                "statusChangedAt": 1571071699.901
            },
            {
                "id": "fb62536d-2a98-4190-a6fc-4EXAMPLE7470",
                "resourceName": "LoadBalancer-1",
                "resourceType": "LoadBalancer",
                "createdAt": 1571071699.885,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "MEAN-1",
                "operationType": "AttachInstancesToLoadBalancer",
                "status": "Started",
                "statusChangedAt": 1571071699.885
            },
            {
                "id": "787dac0d-f98d-46c3-8571-3EXAMPLE5a85",
                "resourceName": "MEAN-1",
                "resourceType": "Instance",
                "createdAt": 1571071699.901,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "LoadBalancer-1",
                "operationType": "AttachInstancesToLoadBalancer",
                "status": "Started",
                "statusChangedAt": 1571071699.901
            }
        ]
    }
