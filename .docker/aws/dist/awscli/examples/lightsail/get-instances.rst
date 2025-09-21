**To get information about all instances**

The following ``get-instances`` example displays details about all of the instances in the configured AWS Region. ::

    aws lightsail get-instances

Output::

    {
        "instances": [
            {
                "name": "Windows_Server_2022-1",
                "arn": "arn:aws:lightsail:us-west-2:111122223333:Instance/0f44fbb9-8f55-4e47-a25e-EXAMPLE04763",
                "supportCode": "62EXAMPLE362/i-0bEXAMPLE71a686b9",
                "createdAt": 1571332358.665,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "resourceType": "Instance",
                "tags": [],
                "blueprintId": "windows_server_2022",
                "blueprintName": "Windows Server 2022",
                "bundleId": "large_win_3_0",
                "isStaticIp": false,
                "privateIpAddress": "192.0.2.0",
                "publicIpAddress": "192.0.2.0",
                "hardware": {
                    "cpuCount": 1,
                    "disks": [
                        {
                            "createdAt": 1571332358.665,
                            "sizeInGb": 160,
                            "isSystemDisk": true,
                            "iops": 180,
                            "path": "/dev/sda1",
                            "attachedTo": "Windows_Server_2022-1",
                            "attachmentState": "attached"
                        },
                        {
                            "name": "my-disk-for-windows-server",
                            "arn": "arn:aws:lightsail:us-west-2:111122223333:Disk/4123a81c-484c-49ea-afea-5EXAMPLEda87",
                            "supportCode": "6EXAMPLE3362/vol-0EXAMPLEb2b99ca3d",
                            "createdAt": 1571355063.494,
                            "location": {
                                "availabilityZone": "us-west-2a",
                                "regionName": "us-west-2"
                            },
                            "resourceType": "Disk",
                            "tags": [],
                            "sizeInGb": 128,
                            "isSystemDisk": false,
                            "iops": 384,
                            "path": "/dev/xvdf",
                            "state": "in-use",
                            "attachedTo": "Windows_Server_2022-1",
                            "isAttached": true,
                            "attachmentState": "attached"
                        }
                    ],
                    "ramSizeInGb": 8.0
                },
                "networking": {
                    "monthlyTransfer": {
                        "gbPerMonthAllocated": 3072
                    },
                    "ports": [
                        {
                            "fromPort": 80,
                            "toPort": 80,
                            "protocol": "tcp",
                            "accessFrom": "Anywhere (0.0.0.0/0)",
                            "accessType": "public",
                            "commonName": "",
                            "accessDirection": "inbound"
                        },
                        {
                            "fromPort": 22,
                            "toPort": 22,
                            "protocol": "tcp",
                            "accessFrom": "Anywhere (0.0.0.0/0)",
                            "accessType": "public",
                            "commonName": "",
                            "accessDirection": "inbound"
                        },
                        {
                            "fromPort": 3389,
                            "toPort": 3389,
                            "protocol": "tcp",
                            "accessFrom": "Anywhere (0.0.0.0/0)",
                            "accessType": "public",
                            "commonName": "",
                            "accessDirection": "inbound"
                        }
                    ]
                },
                "state": {
                    "code": 16,
                    "name": "running"
                },
                "username": "Administrator",
                "sshKeyName": "LightsailDefaultKeyPair"
            },
            {
                "name": "MEAN-1",
                "arn": "arn:aws:lightsail:us-west-2:111122223333:Instance/bd470fc5-a68b-44c5-8dbc-8EXAMPLEbada",
                "supportCode": "6EXAMPLE3362/i-0EXAMPLEa407c97d3",
                "createdAt": 1570635023.124,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "resourceType": "Instance",
                "tags": [],
                "blueprintId": "mean",
                "blueprintName": "MEAN",
                "bundleId": "medium_3_0",
                "isStaticIp": false,
                "privateIpAddress": "192.0.2.0",
                "publicIpAddress": "192.0.2.0",
                "hardware": {
                    "cpuCount": 2,
                    "disks": [
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
                            "tags": [
                                {
                                    "key": "test"
                                }
                            ],
                            "sizeInGb": 8,
                            "isSystemDisk": false,
                            "iops": 240,
                            "path": "/dev/xvdf",
                            "state": "in-use",
                            "attachedTo": "MEAN-1",
                            "isAttached": true,
                            "attachmentState": "attached"
                        },
                        {
                            "createdAt": 1570635023.124,
                            "sizeInGb": 80,
                            "isSystemDisk": true,
                            "iops": 240,
                            "path": "/dev/sda1",
                            "attachedTo": "MEAN-1",
                            "attachmentState": "attached"
                        }
                    ],
                    "ramSizeInGb": 4.0
                },
                "networking": {
                    "monthlyTransfer": {
                        "gbPerMonthAllocated": 4096
                    },
                    "ports": [
                        {
                            "fromPort": 80,
                            "toPort": 80,
                            "protocol": "tcp",
                            "accessFrom": "Anywhere (0.0.0.0/0)",
                            "accessType": "public",
                            "commonName": "",
                            "accessDirection": "inbound"
                        },
                        {
                            "fromPort": 22,
                            "toPort": 22,
                            "protocol": "tcp",
                            "accessFrom": "Anywhere (0.0.0.0/0)",
                            "accessType": "public",
                            "commonName": "",
                            "accessDirection": "inbound"
                        },
                        {
                            "fromPort": 443,
                            "toPort": 443,
                            "protocol": "tcp",
                            "accessFrom": "Anywhere (0.0.0.0/0)",
                            "accessType": "public",
                            "commonName": "",
                            "accessDirection": "inbound"
                        }
                    ]
                },
                "state": {
                    "code": 16,
                    "name": "running"
                },
                "username": "bitnami",
                "sshKeyName": "MyTestKey"
            }
        ]
    }