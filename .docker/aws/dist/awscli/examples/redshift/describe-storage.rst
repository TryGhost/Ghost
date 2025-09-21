**To describe storage**

The following ``describe-storage`` example displays details about the backup storage and provisional storage sizes for the account. ::

    aws redshift describe-storage

Output::

    {
        "TotalBackupSizeInMegaBytes": 193149.0,
        "TotalProvisionedStorageInMegaBytes": 655360.0
    }

For more information, see `Managing Snapshot Storage <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-snapshots.html#managing-snapshot-storage>`__ in the *Amazon Redshift Cluster Management Guide*.
