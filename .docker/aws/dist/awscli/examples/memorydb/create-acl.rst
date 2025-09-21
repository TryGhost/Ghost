**To create an ACL**

The following ``create-acl`` example creates a new Access control list. ::

    aws memorydb create-acl \
        --acl-name "new-acl-1" \
        --user-names "my-user"

Output::

    {
        "ACL": {
            "Name": "new-acl-1",
            "Status": "creating",
            "UserNames": [
                "my-user"
            ],
            "MinimumEngineVersion": "6.2",
            "Clusters": [],
            "ARN": "arn:aws:memorydb:us-east-1:491658xxxxxx:acl/new-acl-1"
        }
    }

For more information, see `Authenticating users with Access Control Lists <https://docs.aws.amazon.com/memorydb/latest/devguide/clusters.acls.html>`__ in the *MemoryDB User Guide*.
