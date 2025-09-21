**To creat a user**

The following ``create-user`` example creates a new user. ::

    aws memorydb create-user \
        --user-name user-name-1 \
        --access-string "~objects:* ~items:* ~public:*" \
         --authentication-mode \
             Passwords="enterapasswordhere",Type=password

Output::

    {
        "User": {
            "Name": "user-name-1",
            "Status": "active",
            "AccessString": "off ~objects:* ~items:* ~public:* resetchannels -@all",
            "ACLNames": [],
            "MinimumEngineVersion": "6.2",
            "Authentication": {
                "Type": "password",
                "PasswordCount": 1
            },
            "ARN": "arn:aws:memorydb:us-west-2:491658xxxxxx:user/user-name-1"
        }
    }

For more information, see `Authenticating users with Access Control Lists <https://docs.aws.amazon.com/memorydb/latest/devguide/clusters.acls.html>`__ in the *MemoryDB User Guide*.
