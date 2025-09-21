**To create a new user**

This example creates a new user in a Simple AD or Microsoft AD directory.

Command::

  aws workdocs create-user --organization-id d-926726012c --username exampleUser2 --email-address exampleUser2@site.awsapps.com --given-name example2Name --surname example2Surname --password examplePa$$w0rd

Output::

  {
    "User": {
        "Id": "S-1-1-11-1111111111-2222222222-3333333333-3333&d-926726012c",
        "Username": "exampleUser2",
        "EmailAddress": "exampleUser2@site.awsapps.com",
        "GivenName": "example2Name",
        "Surname": "example2Surname",
        "OrganizationId": "d-926726012c",
        "RootFolderId": "35b886cb17198cbd547655e58b025dff0cf34aaed638be52009567e23dc67390",
        "RecycleBinFolderId": "9858c3e9ed4c2460dde9aadb4c69fde998070dd46e5e985bd08ec6169ea249ff",
        "Status": "ACTIVE",
        "Type": "MINIMALUSER",
        "CreatedTimestamp": 1535478836.584,
        "ModifiedTimestamp": 1535478836.584,
        "Storage": {
            "StorageUtilizedInBytes": 0,
            "StorageRule": {
                "StorageAllocatedInBytes": 0,
                "StorageType": "QUOTA"
            }
        }
    }
  }