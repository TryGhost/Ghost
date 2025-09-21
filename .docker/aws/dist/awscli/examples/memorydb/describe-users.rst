**To return a list of users**

The following `describe-users`` returns a list of users. ::

    aws memorydb describe-users

Output ::

    {
        "Users": [
            {
                "Name": "default",
                "Status": "active",
                "AccessString": "on ~* &* +@all",
                "ACLNames": [
                    "open-access"
                ],
                "MinimumEngineVersion": "6.0",
                "Authentication": {
                    "Type": "no-password"
                },
                "ARN": "arn:aws:memorydb:us-east-1:491658xxxxxx:user/default"
            },
            {
                "Name": "my-user",
                "Status": "active",
                "AccessString": "off ~objects:* ~items:* ~public:* resetchannels -@all",
                "ACLNames": [],
                "MinimumEngineVersion": "6.2",
                "Authentication": {
                    "Type": "password",
                    "PasswordCount": 2
                },
                "ARN": "arn:aws:memorydb:us-east-1:491658xxxxxx:user/my-user"
            }
        ]
    }

For more information, see `Authenticating users with Access Control Lists <https://docs.aws.amazon.com/memorydb/latest/devguide/clusters.acls.html>`__ in the *MemoryDB User Guide*.
