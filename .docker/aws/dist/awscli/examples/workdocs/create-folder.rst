**To create a folder**

This example creates a folder.

Command::

  aws workdocs create-folder --name documents --parent-folder-id 1ece93e5fe75315c7407c4967918b4fd9da87ddb2a588e67b7fdaf4a98fde678

Output::

  {
    "Metadata": {
        "Id": "50893c0af679524d1a0e0651130ed6d073e1a05f95bd12c42dcde5d35634ed08",
        "Name": "documents",
        "CreatorId": "S-1-1-11-1111111111-2222222222-3333333333-3333&d-926726012c",
        "ParentFolderId": "1ece93e5fe75315c7407c4967918b4fd9da87ddb2a588e67b7fdaf4a98fde678",
        "CreatedTimestamp": 1534450467.622,
        "ModifiedTimestamp": 1534450467.622,
        "ResourceState": "ACTIVE",
        "Signature": "",
        "Size": 0,
        "LatestVersionSize": 0
    }
  }