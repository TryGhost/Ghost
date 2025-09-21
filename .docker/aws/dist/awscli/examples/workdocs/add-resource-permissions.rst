**To add permissions for a resource**

This example adds permissions to the resource for the specified principals.

Command::

  aws workdocs add-resource-permissions --resource-id d90d93c1fe44bad0c8471e973ebaab339090401a95e777cffa58e977d2983b65 --principals Id=anonymous,Type=ANONYMOUS,Role=VIEWER

Output::

  {
    "ShareResults": [
        {
            "PrincipalId": "anonymous",
            "Role": "VIEWER",
            "Status": "SUCCESS",
            "ShareId": "d90d93c1fe44bad0c8471e973ebaab339090401a95e777cffa58e977d2983b65",
            "StatusMessage": ""
        }
    ]
  }