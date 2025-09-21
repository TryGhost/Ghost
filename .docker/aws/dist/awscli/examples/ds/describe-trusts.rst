**To get details about your trust relationships**

The following ``describe-trusts`` example displays details about the trust relationships for the specified directory. ::

     aws ds describe-trusts \
        --directory-id d-a1b2c3d4e5

Output::

    {
        "Trusts": [
            {
                "DirectoryId": "d-a1b2c3d4e5",
                "TrustId": "t-9a8b7c6d5e",
                "RemoteDomainName": "other.example.com",
                "TrustType": "Forest",
                "TrustDirection": "Two-Way",
                "TrustState": "Verified",
                "CreatedDateTime": "2017-06-20T18:08:45.614000-07:00",
                "LastUpdatedDateTime": "2019-06-04T10:52:12.410000-07:00",
                "StateLastUpdatedDateTime": "2019-06-04T10:52:12.410000-07:00",
                "SelectiveAuth": "Disabled"
            }
        ]
    }
