**Example 1: To create a single instance**

The following ``create-instances`` example creates an instance in the specified AWS Region and Availability Zone, using the WordPress blueprint, and the $5.00 USD bundle. ::

    aws lightsail create-instances \
        --instance-names Instance-1 \
        --availability-zone us-west-2a \
        --blueprint-id wordpress \
        --bundle-id nano_3_0

Output::

    {
        "operations": [
            {
                "id": "9a77158f-7be3-4d6d-8054-cf5ae2b720cc",
                "resourceName": "Instance-1",
                "resourceType": "Instance",
                "createdAt": 1569447986.061,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationType": "CreateInstance",
                "status": "Started",
                "statusChangedAt": 1569447986.061
            }
        ]
    }

**Example 2: To create multiple instances at one time**

The following ``create-instances`` example creates three instances in the specified AWS Region and Availability Zone, using the WordPress blueprint, and the $5.00 USD bundle. ::

    aws lightsail create-instances \
        --instance-names {"Instance1","Instance2","Instance3"} \
        --availability-zone us-west-2a \
        --blueprint-id wordpress \
        --bundle-id nano_3_0

Output::

    {
        "operations": [
            {
                "id": "5492f015-9d2e-48c6-8eea-b516840e6903",
                "resourceName": "Instance1",
                "resourceType": "Instance",
                "createdAt": 1569448780.054,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationType": "CreateInstance",
                "status": "Started",
                "statusChangedAt": 1569448780.054
            },
            {
                "id": "c58b5f46-2676-44c8-b95c-3ad375898515",
                "resourceName": "Instance2",
                "resourceType": "Instance",
                "createdAt": 1569448780.054,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationType": "CreateInstance",
                "status": "Started",
                "statusChangedAt": 1569448780.054
            },
            {
                "id": "a5ad8006-9bee-4499-9eb7-75e42e6f5882",
                "resourceName": "Instance3",
                "resourceType": "Instance",
                "createdAt": 1569448780.054,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationType": "CreateInstance",
                "status": "Started",
                "statusChangedAt": 1569448780.054
            }
        ]
    }