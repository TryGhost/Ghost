**To unpeer the Amazon Lightsail virtual private cloud**

The following ``unpeer-vpc`` example unpeers the Amazon Lightsail virtual private cloud (VPC) for the specified AWS Region. ::

    aws lightsail unpeer-vpc \
        --region us-west-2

Output::

    {
        "operation": {
            "id": "531aca64-7157-47ab-84c6-eEXAMPLEd898",
            "resourceName": "vpc-0EXAMPLEa5261efb3",
            "resourceType": "PeeredVpc",
            "createdAt": 1571694109.945,
            "location": {
                "availabilityZone": "all",
                "regionName": "us-west-2"
            },
            "isTerminal": true,
            "operationDetails": "vpc-e2b3eb9b",
            "operationType": "UnpeeredVpc",
            "status": "Succeeded",
            "statusChangedAt": 1571694109.945
        }
    }
