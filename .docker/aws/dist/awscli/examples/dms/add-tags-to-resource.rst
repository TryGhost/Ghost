**To add tags to a resource**

The following ``add-tags-to-resource`` example adds tags to a replication instance. ::

    aws dms add-tags-to-resource \
        --resource-arn arn:aws:dms:us-east-1:123456789012:rep:T3OM7OUB5NM2LCVZF7JPGJRNUE \
        --tags Key=Environment,Value=PROD Key=Project,Value=dbMigration

This command produces no output.

For more information, see `Tagging Resources <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tagging.html>`__ in the *AWS Database Migration Service User Guide*.
