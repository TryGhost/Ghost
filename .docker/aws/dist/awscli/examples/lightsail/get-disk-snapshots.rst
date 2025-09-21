**To get information about all disk snapshots**

The following ``get-disk-snapshots`` example displays details about all of the disk snapshots in the configured AWS Region. ::

    aws lightsail get-disk-snapshots

Output::

    {
        "diskSnapshots": [
            {
                "name": "Disk-2-1571090588",
                "arn": "arn:aws:lightsail:us-west-2:111122223333:DiskSnapshot/32e889a9-38d4-4687-9f21-eEXAMPLE7839",
                "supportCode": "6EXAMPLE3362/snap-0EXAMPLE1ca192a4",
                "createdAt": 1571090591.226,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "resourceType": "DiskSnapshot",
                "tags": [],
                "sizeInGb": 8,
                "state": "completed",
                "progress": "100%",
                "fromDiskName": "Disk-2",
                "fromDiskArn": "arn:aws:lightsail:us-west-2:111122223333:Disk/6a343ff8-6341-422d-86e2-bEXAMPLE16c2",
                "isFromAutoSnapshot": false
            },
            {
                "name": "Disk-1-1566839161",
                "arn": "arn:aws:lightsail:us-west-2:111122223333:DiskSnapshot/e2d0fa53-8ee0-41a0-8e56-0EXAMPLE1051",
                "supportCode": "6EXAMPLE3362/snap-0EXAMPLEe06100d09",
                "createdAt": 1566839163.749,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "resourceType": "DiskSnapshot",
                "tags": [],
                "sizeInGb": 8,
                "state": "completed",
                "progress": "100%",
                "fromDiskName": "Disk-1",
                "fromDiskArn": "arn:aws:lightsail:us-west-2:111122223333:Disk/c21cfb0a-07f2-44ae-9a23-bEXAMPLE8096",
                "isFromAutoSnapshot": false
            }
        ]
    }
