**To delete an ACL**

The following ``delete-acl`` example deletes an Access control list. ::

    aws memorydb delete-acl \
        --acl-name "new-acl-1"

Output::

    {
        "ACL": {
            "Name": "new-acl-1",
            "Status": "deleting",
            "UserNames": [
                "pat"
            ],
            "MinimumEngineVersion": "6.2",
            "Clusters": [],
            "ARN": "arn:aws:memorydb:us-east-1:491658xxxxxx:acl/new-acl-1"
        }
    }

For more information, see `Authenticating users with Access Control Lists <https://docs.aws.amazon.com/memorydb/latest/devguide/clusters.acls.html>`__ in the *MemoryDB User Guide*.
