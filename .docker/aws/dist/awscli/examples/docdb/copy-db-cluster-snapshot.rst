**To create a copy of a snapshot**

The following ``copy-db-cluster-snapshot`` example makes a copy of ``sample-cluster-snapshot`` named ``sample-cluster-snapshot-copy``. The copy has all the tags of the original plus a new tag with the key name ``CopyNumber``. ::

    aws docdb copy-db-cluster-snapshot \
        --source-db-cluster-snapshot-identifier sample-cluster-snapshot \
        --target-db-cluster-snapshot-identifier sample-cluster-snapshot-copy \
        --copy-tags \
        --tags Key="CopyNumber",Value="1"

This command produces no output.

For more information, see `Copying a Cluster Snapshot <https://docs.aws.amazon.com/documentdb/latest/developerguide/backup-restore.db-cluster-snapshot-copy.html>`__ in the *Amazon DocumentDB Developer Guide*.
