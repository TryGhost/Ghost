**To update a user**

The following ``update-user`` modifies a user's access string. ::

    aws memorydb update-user \
        --user-name my-user \
        --access-string "off ~objects:* ~items:* ~public:* resetchannels -@all"

Output::

    {
        "User": {
            "Name": "my-user",
            "Status": "modifying",
            "AccessString": "off ~objects:* ~items:* ~public:* resetchannels -@all",
            "ACLNames": [
                "myt-acl"
            ],
            "MinimumEngineVersion": "6.2",
            "Authentication": {
                "Type": "password",
                "PasswordCount": 2
            },
            "ARN": "arn:aws:memorydb:us-east-1:491658xxxxxx:user/my-user"
        }
    }

For more information, see `Authenticating users with Access Control Lists <https://docs.aws.amazon.com/memorydb/latest/devguide/clusters.acls.html>`__ in the *MemoryDB User Guide*.
