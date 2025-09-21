**To list the tags for a resource**

The following ``list-tags-for-resource`` example lists the tags for a replication instance. ::

    aws dms list-tags-for-resource \
        --resource-arn arn:aws:dms:us-east-1:123456789012:rep:T3OM7OUB5NM2LCVZF7JPGJRNUE

Output::

    {
        "TagList": [
            {
                "Key": "Project",
                "Value": "dbMigration"
            },
            {
                "Key": "Environment",
                "Value": "PROD"
            }
        ]
    }


For more information, see `Tagging Resources <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tagging.html>`__ in the *AWS Database Migration Service User Guide*.
