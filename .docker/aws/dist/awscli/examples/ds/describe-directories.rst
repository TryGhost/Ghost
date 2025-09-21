**To get details about your directories**

The following ``describe-directories`` example displays details about the specified directory. ::

     aws ds describe-directories \
        --directory-id d-a1b2c3d4e5

Output::

    {
        "DirectoryDescriptions": [
            {
                "DirectoryId": "d-a1b2c3d4e5",
                "Name": "mydirectory.example.com",
                "ShortName": "mydirectory",
                "Size": "Small",
                "Edition": "Standard",
                "Alias": "d-a1b2c3d4e5",
                "AccessUrl": "d-a1b2c3d4e5.awsapps.com",
                "Stage": "Active",
                "ShareStatus": "Shared",
                "ShareMethod": "HANDSHAKE",
                "ShareNotes": "These are my share notes",
                "LaunchTime": "2019-07-08T15:33:46.327000-07:00",
                "StageLastUpdatedDateTime": "2019-07-08T15:59:12.307000-07:00",
                "Type": "SharedMicrosoftAD",
                "SsoEnabled": false,
                "DesiredNumberOfDomainControllers": 0,
                "OwnerDirectoryDescription": {
                    "DirectoryId": "d-b2c3d4e5f6",
                    "AccountId": "123456789111",
                    "DnsIpAddrs": [
                        "203.113.0.248",
                        "203.113.0.253"
                    ],
                    "VpcSettings": {
                        "VpcId": "vpc-a1b2c3d4",
                        "SubnetIds": [
                            "subnet-a1b2c3d4",
                            "subnet-d4c3b2a1"
                        ],
                        "AvailabilityZones": [
                            "us-west-2a",
                            "us-west-2c"
                        ]
                    }
                }
            }
        ]
    }