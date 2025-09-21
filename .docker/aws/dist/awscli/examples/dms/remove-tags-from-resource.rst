**To remove tags from a replication instance**

The following ``remove-tags-from-resource`` example removes tags from a replication instance. ::

    aws dms remove-tags-from-resource \
        --resource-arn arn:aws:dms:us-east-1:123456789012:rep:T3OM7OUB5NM2LCVZF7JPGJRNUE \
        --tag-keys Environment Project

This command produces no output.

For more information, see `Tagging Resources <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tagging.html>`__ in the *AWS Database Migration Service User Guide*.
