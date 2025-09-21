**To activate a user**

This example activates an inactive user.

Command::

  aws workdocs activate-user --user-id "S-1-1-11-1111111111-2222222222-3333333333-3333&d-926726012c"

Output::

  {
    "User": {
        "Id": "S-1-1-11-1111111111-2222222222-3333333333-3333&d-926726012c",
        "Username": "exampleUser",
        "EmailAddress": "exampleUser@site.awsapps.com",
        "GivenName": "Example",
        "Surname": "User",
        "OrganizationId": "d-926726012c",
        "RootFolderId": "75f67c183aa1217409ac87576a45c03a5df5e6d8c51c35c01669970538e86cd0",
        "RecycleBinFolderId": "642b7dd3e60b14204534f3df7b1959e01b5d170f8c2707f410e40a8149120a57",
        "Status": "ACTIVE",
        "Type": "MINIMALUSER",
        "CreatedTimestamp": 1521226107.747,
        "ModifiedTimestamp": 1525297406.462,
        "Storage": {
            "StorageUtilizedInBytes": 0,
            "StorageRule": {
                "StorageAllocatedInBytes": 0,
                "StorageType": "QUOTA"
            }
        }
    }
  }
