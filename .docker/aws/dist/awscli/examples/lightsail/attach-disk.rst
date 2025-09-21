**To attach a block storage disk to an instance**

The following ``attach-disk`` example attaches disk ``Disk-1`` to instance ``WordPress_Multisite-1`` with the disk path of ``/dev/xvdf`` ::

    aws lightsail attach-disk \
        --disk-name Disk-1 \
        --disk-path /dev/xvdf \
        --instance-name WordPress_Multisite-1

Output::

    {
        "operations": [
            {
                "id": "10a08267-19ce-43be-b913-6EXAMPLE7e80",
                "resourceName": "Disk-1",
                "resourceType": "Disk",
                "createdAt": 1571071465.472,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "WordPress_Multisite-1",
                "operationType": "AttachDisk",
                "status": "Started",
                "statusChangedAt": 1571071465.472
            },
            {
                "id": "2912c477-5295-4539-88c9-bEXAMPLEd1f0",
                "resourceName": "WordPress_Multisite-1",
                "resourceType": "Instance",
                "createdAt": 1571071465.474,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "Disk-1",
                "operationType": "AttachDisk",
                "status": "Started",
                "statusChangedAt": 1571071465.474
            }
        ]
    }
