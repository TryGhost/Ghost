**To describe the contents of a folder**

This example describes all the active contents of the specified folder, including its documents and subfolders, sorted by date in ascending order.

Command::

  aws workdocs describe-folder-contents --folder-id 1ece93e5fe75315c7407c4967918b4fd9da87ddb2a588e67b7fdaf4a98fde678 --sort DATE --order ASCENDING --type ALL

Output::

  {
    "Folders": [
        {
            "Id": "50893c0af679524d1a0e0651130ed6d073e1a05f95bd12c42dcde5d35634ed08",
            "Name": "testing",
            "CreatorId": "S-1-1-11-1111111111-2222222222-3333333333-3333&d-926726012c",
            "ParentFolderId": "1ece93e5fe75315c7407c4967918b4fd9da87ddb2a588e67b7fdaf4a98fde678",
            "CreatedTimestamp": 1534450467.622,
            "ModifiedTimestamp": 1534451113.504,
            "ResourceState": "ACTIVE",
            "Signature": "1a23456b78901c23d4ef56gh7EXAMPLE",
            "Size": 23019,
            "LatestVersionSize": 11537
        }
    ],
    "Documents": [
        {
            "Id": "d90d93c1fe44bad0c8471e973ebaab339090401a95e777cffa58e977d2983b65",
            "CreatorId": "S-1-1-11-1111111111-2222222222-3333333333-3333&d-926726012c",
            "ParentFolderId": "1ece93e5fe75315c7407c4967918b4fd9da87ddb2a588e67b7fdaf4a98fde678",
            "CreatedTimestamp": 1529005196.082,
            "ModifiedTimestamp": 1534452483.01,
            "LatestVersionMetadata": {
                "Id": "1534452029587-15e129dfc187505c407588df255be83de2920d733859f1d2762411d22a83e3ef",
                "Name": "exampleDoc.docx",
                "ContentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Size": 13922,
                "Signature": "1a23456b78901c23d4ef56gh7EXAMPLE",
                "Status": "ACTIVE",
                "CreatedTimestamp": 1534452029.587,
                "ModifiedTimestamp": 1534452029.587,
                "CreatorId": "S-1-1-11-1111111111-2222222222-3333333333-3333&d-926726012c"
            },
            "ResourceState": "ACTIVE"
        }
    ]
  }