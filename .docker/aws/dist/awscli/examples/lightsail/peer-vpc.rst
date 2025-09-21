**To peer the Amazon Lightsail virtual private cloud**

The following ``peer-vpc`` example peers the Amazon Lightsail virtual private cloud (VPC) for the specified AWS Region. ::

    aws lightsail peer-vpc \
        --region us-west-2


Output::

    {
        "operation": {
            "id": "787e846a-54ac-497f-bce2-9EXAMPLE5d91",
            "resourceName": "vpc-0EXAMPLEa5261efb3",
            "resourceType": "PeeredVpc",
            "createdAt": 1571694233.104,
            "location": {
                "availabilityZone": "all",
                "regionName": "us-west-2"
            },
            "isTerminal": true,
            "operationDetails": "vpc-e2b3eb9b",
            "operationType": "PeeredVpc",
            "status": "Succeeded",
            "statusChangedAt": 1571694233.104
        }
    }
