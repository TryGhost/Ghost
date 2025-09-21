**To archive a snapshot**

The following ``modify-snapshot-tier`` example archives the specified snapshot. The ``TieringStartTime`` response parameter indicates the date and time at which the archive process was started, in UTC time format (YYYY-MM-DDTHH:MM:SSZ). ::

    aws ec2 modify-snapshot-tier \
        --snapshot-id snap-01234567890abcedf \
        --storage-tier archive

Output::

    {
        "SnapshotId": "snap-01234567890abcedf",
        "TieringStartTime": "2021-09-15T16:44:37.574Z"
    }

For more information about snapshot archiving, see `Archive Amazon EBS snapshots <https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-archive.html>`__ in the *Amazon EBS User Guide*.
