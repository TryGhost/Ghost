**To get the CloudFormation stack records and their associated stacks**

The following ``get-cloud-formation-stack-records`` example displays details about the CloudFormation stack records and their associated stacks used to create Amazon EC2 resources from exported Amazon Lightsail snapshots. ::

    aws lightsail get-cloud-formation-stack-records

Output::

    {
        "cloudFormationStackRecords": [
            {
                "name": "CloudFormationStackRecord-588a4243-e2d1-490d-8200-3a7513ecebdf",
                "arn": "arn:aws:lightsail:us-west-2:111122223333:CloudFormationStackRecord/28d646ab-27bc-48d9-a422-1EXAMPLE6d37",
                "createdAt": 1565301666.586,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "resourceType": "CloudFormationStackRecord",
                "state": "Succeeded",
                "sourceInfo": [
                    {
                        "resourceType": "ExportSnapshotRecord",
                        "name": "ExportSnapshotRecord-e02f23d7-0453-4aa9-9c95-91aa01a141dd",
                        "arn": "arn:aws:lightsail:us-west-2:111122223333:ExportSnapshotRecord/f12b8792-f3ea-4d6f-b547-2EXAMPLE8796"
                    }
                ],
                "destinationInfo": {
                    "id": "arn:aws:cloudformation:us-west-2:111122223333:stack/Lightsail-Stack-588a4243-e2d1-490d-8200-3EXAMPLEebdf/063203b0-ba28-11e9-838b-0EXAMPLE8b00",
                    "service": "Aws::CloudFormation::Stack"
                }
            }
        ]
    }
