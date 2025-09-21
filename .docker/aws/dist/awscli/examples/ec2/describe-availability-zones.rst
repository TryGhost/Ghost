**To describe your Availability Zones**

The following example ``describe-availability-zones`` displays details for the Availability Zones that are available to you. The response includes Availability Zones only for the current Region. In this example, it uses the profiles default ``us-west-2`` (Oregon) Region. ::

    aws ec2 describe-availability-zones

Output::

    {
        "AvailabilityZones": [
            {
                "State": "available",
                "OptInStatus": "opt-in-not-required",
                "Messages": [],
                "RegionName": "us-west-2",
                "ZoneName": "us-west-2a",
                "ZoneId": "usw2-az1",
                "GroupName": "us-west-2",
                "NetworkBorderGroup": "us-west-2"
            },
            {
                "State": "available",
                "OptInStatus": "opt-in-not-required",
                "Messages": [],
                "RegionName": "us-west-2",
                "ZoneName": "us-west-2b",
                "ZoneId": "usw2-az2",
                "GroupName": "us-west-2",
                "NetworkBorderGroup": "us-west-2"
            },
            {
                "State": "available",
                "OptInStatus": "opt-in-not-required",
                "Messages": [],
                "RegionName": "us-west-2",
                "ZoneName": "us-west-2c",
                "ZoneId": "usw2-az3",
                "GroupName": "us-west-2",
                "NetworkBorderGroup": "us-west-2"
            },
            {
                "State": "available",
                "OptInStatus": "opt-in-not-required",
                "Messages": [],
                "RegionName": "us-west-2",
                "ZoneName": "us-west-2d",
                "ZoneId": "usw2-az4",
                "GroupName": "us-west-2",
                "NetworkBorderGroup": "us-west-2"
            },
            {
                "State": "available",
                "OptInStatus": "opted-in",
                "Messages": [],
                "RegionName": "us-west-2",
                "ZoneName": "us-west-2-lax-1a",
                "ZoneId": "usw2-lax1-az1",
                "GroupName": "us-west-2-lax-1",
                "NetworkBorderGroup": "us-west-2-lax-1"
            }
        ]
    }
