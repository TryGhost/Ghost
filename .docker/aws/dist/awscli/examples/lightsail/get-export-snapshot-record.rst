**To get the records of snapshots exported to Amazon EC2**

The following ``get-export-snapshot-record`` example displays details about Amazon Lightsail instance or disk snapshots exported to Amazon EC2. ::

    aws lightsail get-export-snapshot-records

Output::

    {
        "exportSnapshotRecords": [
            {
                "name": "ExportSnapshotRecord-d2da10ce-0b3c-4ae1-ab3a-2EXAMPLEa586",
                "arn": "arn:aws:lightsail:us-west-2:111122223333:ExportSnapshotRecord/076c7060-b0cc-4162-98f0-2EXAMPLEe28e",
                "createdAt": 1543534665.678,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "resourceType": "ExportSnapshotRecord",
                "state": "Succeeded",
                "sourceInfo": {
                    "resourceType": "InstanceSnapshot",
                    "createdAt": 1540339310.706,
                    "name": "WordPress-512MB-Oregon-1-1540339219",
                    "arn": "arn:aws:lightsail:us-west-2:111122223333:InstanceSnapshot/5446f534-ed60-4c17-b4a5-bEXAMPLEf8b7",
                    "fromResourceName": "WordPress-512MB-Oregon-1",
                    "fromResourceArn": "arn:aws:lightsail:us-west-2:111122223333:Instance/4b8f1f24-e4d1-4cf3-88ff-cEXAMPLEa397",
                    "instanceSnapshotInfo": {
                        "fromBundleId": "nano_2_0",
                        "fromBlueprintId": "wordpress_4_9_8",
                        "fromDiskInfo": [
                            {
                                "path": "/dev/sda1",
                                "sizeInGb": 20,
                                "isSystemDisk": true
                            }
                        ]
                    }
                },
                "destinationInfo": {
                    "id": "ami-0EXAMPLEc0d65058e",
                    "service": "Aws::EC2::Image"
                }
            },
            {
                "name": "ExportSnapshotRecord-1c94e884-40ff-4fe1-9302-0EXAMPLE14c2",
                "arn": "arn:aws:lightsail:us-west-2:111122223333:ExportSnapshotRecord/fb392ce8-6567-4013-9bfd-3EXAMPLE5b4c",
                "createdAt": 1543432110.2,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "resourceType": "ExportSnapshotRecord",
                "state": "Succeeded",
                "sourceInfo": {
                    "resourceType": "InstanceSnapshot",
                    "createdAt": 1540833603.545,
                    "name": "LAMP_PHP_5-512MB-Oregon-1-1540833565",
                    "arn": "arn:aws:lightsail:us-west-2:111122223333:InstanceSnapshot/82334399-b5f2-49ec-8382-0EXAMPLEe45f",
                    "fromResourceName": "LAMP_PHP_5-512MB-Oregon-1",
                    "fromResourceArn": "arn:aws:lightsail:us-west-2:111122223333:Instance/863b9f35-ab1e-4418-bdd2-1EXAMPLEbab2",
                    "instanceSnapshotInfo": {
                        "fromBundleId": "nano_2_0",
                        "fromBlueprintId": "lamp_5_6_37_2",
                        "fromDiskInfo": [
                            {
                                "path": "/dev/sda1",
                                "sizeInGb": 20,
                                "isSystemDisk": true
                            }
                        ]
                    }
                },
                "destinationInfo": {
                    "id": "ami-0EXAMPLE7c5ec84e2",
                    "service": "Aws::EC2::Image"
                }
            }
        ]
    }
