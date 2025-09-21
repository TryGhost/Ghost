**To delete a key pair**

The following ``delete-key-pair`` example deletes the specified key pair. ::

    aws lightsail delete-key-pair \
        --key-pair-name MyPersonalKeyPair

Output::

    {
        "operation": {
            "id": "81621463-df38-4810-b866-6e801a15abbf",
            "resourceName": "MyPersonalKeyPair",
            "resourceType": "KeyPair",
            "createdAt": 1569874626.466,
            "location": {
                "availabilityZone": "all",
                "regionName": "us-west-2"
            },
            "isTerminal": true,
            "operationType": "DeleteKeyPair",
            "status": "Succeeded",
            "statusChangedAt": 1569874626.685
        }
    }
