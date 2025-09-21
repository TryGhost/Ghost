**To get information about all block storage disks**

The following ``get-disks`` example displays details about all of the disks in the configured AWS Region. ::

    aws lightsail get-disks

Output::

    {
        "disks": [
            {
                "name": "Disk-2",
                "arn": "arn:aws:lightsail:us-west-2:111122223333:Disk/6a343ff8-6341-422d-86e2-bEXAMPLE16c2",
                "supportCode": "6EXAMPLE3362/vol-0EXAMPLE929602087",
                "createdAt": 1571090461.634,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "resourceType": "Disk",
                "tags": [],
                "sizeInGb": 8,
                "isSystemDisk": false,
                "iops": 100,
                "state": "available",
                "isAttached": false,
                "attachmentState": "detached"
            },
            {
                "name": "Disk-1",
                "arn": "arn:aws:lightsail:us-west-2:111122223333:Disk/c21cfb0a-07f2-44ae-9a23-bEXAMPLE8096",
                "supportCode": "6EXAMPLE3362/vol-0EXAMPLEf2f88b32f",
                "createdAt": 1566585439.587,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "resourceType": "Disk",
                "tags": [],
                "sizeInGb": 8,
                "isSystemDisk": false,
                "iops": 100,
                "path": "/dev/xvdf",
                "state": "in-use",
                "attachedTo": "WordPress_Multisite-1",
                "isAttached": true,
                "attachmentState": "attached"
            }
        ]
    }
