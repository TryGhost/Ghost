**To get information about all of your instance snapshots**

The following ``get-instance-snapshots`` example displays details about all of the instance snapshots in the configured AWS Region. ::

    aws lightsail get-instance-snapshots

Output::

    {
        "instanceSnapshots": [
            {
                "name": "MEAN-1-1571421498",
                "arn": "arn:aws:lightsail:us-west-2:111122223333:InstanceSnapshot/a20e6ebe-b0ee-4ae4-a750-3EXAMPLEcb0c",
                "supportCode": "6EXAMPLE3362/ami-0EXAMPLEe33cabfa1",
                "createdAt": 1571421527.755,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "resourceType": "InstanceSnapshot",
                "tags": [
                    {
                        "key": "no_delete"
                    }
                ],
                "state": "available",
                "fromAttachedDisks": [],
                "fromInstanceName": "MEAN-1",
                "fromInstanceArn": "arn:aws:lightsail:us-west-2:111122223333:Instance/1761aa0a-6038-4f25-8b94-2EXAMPLE19fd",
                "fromBlueprintId": "wordpress",
                "fromBundleId": "micro_3_0",
                "isFromAutoSnapshot": false,
                "sizeInGb": 40
            },
            {
                "name": "MEAN-1-1571419854",
                "arn": "arn:aws:lightsail:us-west-2:111122223333:InstanceSnapshot/ac54700c-48a8-40fd-b065-2EXAMPLEac8f",
                "supportCode": "6EXAMPLE3362/ami-0EXAMPLE67a73020d",
                "createdAt": 1571419891.927,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "resourceType": "InstanceSnapshot",
                "tags": [],
                "state": "available",
                "fromAttachedDisks": [],
                "fromInstanceName": "MEAN-1",
                "fromInstanceArn": "arn:aws:lightsail:us-west-2:111122223333:Instance/bd470fc5-a68b-44c5-8dbc-8EXAMPLEbada",
                "fromBlueprintId": "mean",
                "fromBundleId": "medium_3_0",
                "isFromAutoSnapshot": false,
                "sizeInGb": 80
            }
        ]
    }