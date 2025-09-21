**To get all AWS Regions for Amazon Lightsail**

The following ``get-regions`` example displays details about all of the AWS Regions for Amazon Lightsail. ::

    aws lightsail get-regions

Output::

    {
        "regions": [
            {
                "continentCode": "NA",
                "description": "This region is recommended to serve users in the eastern United States",
                "displayName": "Virginia",
                "name": "us-east-1",
                "availabilityZones": [],
                "relationalDatabaseAvailabilityZones": []
            },
            {
                "continentCode": "NA",
                "description": "This region is recommended to serve users in the eastern United States",
                "displayName": "Ohio",
                "name": "us-east-2",
                "availabilityZones": [],
                "relationalDatabaseAvailabilityZones": []
            },
            {
                "continentCode": "NA",
                "description": "This region is recommended to serve users in the northwestern United States, Alaska, and western Canada",
                "displayName": "Oregon",
                "name": "us-west-2",
                "availabilityZones": [],
                "relationalDatabaseAvailabilityZones": []
            },
            ...
            }
        ]
    }
