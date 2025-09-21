**To update a user**

This example updates the time zone for the specified user.

Command::

  aws workdocs update-user --user-id "S-1-1-11-1111111111-2222222222-3333333333-3333&d-926726012c" --time-zone-id "America/Los_Angeles"

Output::

  {
    "User": {
        "Id": "S-1-1-11-1111111111-2222222222-3333333333-3333&d-926726012c",
        "Username": "exampleUser",
        "EmailAddress": "exampleUser@site.awsapps.com",
        "GivenName": "Example",
        "Surname": "User",
        "OrganizationId": "d-926726012c",
        "RootFolderId": "c5eceb5e1a2d1d460c9d1af8330ae117fc8d39bb1d3ed6acd0992d5ff192d986",
        "RecycleBinFolderId": "6ca20102926ad15f04b1d248d6d6e44f2449944eda5c758f9a1e9df6a6b7fa66",
        "Status": "ACTIVE",
        "Type": "USER",
        "TimeZoneId": "America/Los_Angeles",
        "Storage": {
            "StorageUtilizedInBytes": 0,
            "StorageRule": {
                "StorageAllocatedInBytes": 53687091200,
                "StorageType": "QUOTA"
            }
        }
    }
  }
