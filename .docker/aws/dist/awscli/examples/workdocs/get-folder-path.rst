**To retrieve path information for a folder**

This example retrieves the path information (hierarchy from the root folder) for the specified folder, and includes the names of the parent folders.

Command::

  aws workdocs get-folder-path --folder-id 50893c0af679524d1a0e0651130ed6d073e1a05f95bd12c42dcde5d35634ed08 --fields NAME

Output::

  {
    "Path": {
        "Components": [
            {
                "Id": "a43d29cbb8e7c4d25cfee8b803a504b0dc63e760b55ad0c611c6b87691eb6ff3",
                "Name": "/"
            },
            {
                "Id": "1ece93e5fe75315c7407c4967918b4fd9da87ddb2a588e67b7fdaf4a98fde678",
                "Name": "Top Level Folder"
            },
            {
                "Id": "50893c0af679524d1a0e0651130ed6d073e1a05f95bd12c42dcde5d35634ed08",
                "Name": "Sublevel Folder"
            }
        ]
    }
  }