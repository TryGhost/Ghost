**To view archival information about an archived snapshot**

The following ``describe-snapshot-tier-status`` example provides archival information about an archived snapshot. ::

    aws ec2 describe-snapshot-tier-status \
        --filters "Name=snapshot-id, Values=snap-01234567890abcedf"

Output::

    {
        "SnapshotTierStatuses": [
            {
                "Status": "completed",
                "ArchivalCompleteTime": "2021-09-15T17:33:16.147Z",
                "LastTieringProgress": 100,
                "Tags": [],
                "VolumeId": "vol-01234567890abcedf",
                "LastTieringOperationState": "archival-completed",
                "StorageTier": "archive",
                "OwnerId": "123456789012",
                "SnapshotId": "snap-01234567890abcedf",
                "LastTieringStartTime": "2021-09-15T16:44:37.574Z"
            }
        ]
    }

For more information, see `View archived snapshots <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-snapshot-archiving.html#view-archived-snapshot>`__ in the *Amazon Elastic Compute Cloud User Guide*.