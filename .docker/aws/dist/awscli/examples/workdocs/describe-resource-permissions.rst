**To get a list of permissions for a resource**

This example returns a list of the permissions for the specified resource (document or folder).

Command::

  aws workdocs describe-resource-permissions --resource-id 15df51e0335cfcc6a2e4de9dd8be9f22ee40545ad9176f54758dcf903be982d3

Output::

  {
    "Principals": [
        {
            "Id": "anonymous",
            "Type": "ANONYMOUS",
            "Roles": [
                {
                    "Role": "VIEWER",
                    "Type": "DIRECT"
                }
            ]
        },
        {
            "Id": "S-1-1-11-1111111111-2222222222-3333333333-3333&d-926726012c",
            "Type": "USER",
            "Roles": [
                {
                    "Role": "OWNER",
                    "Type": "DIRECT"
                }
            ]
        },
        {
            "Id": "d-926726012c",
            "Type": "ORGANIZATION",
            "Roles": [
                {
                    "Role": "VIEWER",
                    "Type": "INHERITED"
                }
            ]
        }
    ]
  }