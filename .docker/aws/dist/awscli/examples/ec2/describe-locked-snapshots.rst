**To describe the lock status of a snapshot**

The following ``describe-locked-snapshots`` example describes the lock status of the specified snapshot. ::

    aws ec2 describe-locked-snapshots \
        --snapshot-ids snap-0b5e733b4a8df6e0d

Output::

    {
        "Snapshots": [
            {
                "OwnerId": "123456789012",
                "SnapshotId": "snap-0b5e733b4a8df6e0d",
                "LockState": "governance",
                "LockDuration": 365,
                "LockCreatedOn": "2024-05-05T00:56:06.208000+00:00",
                "LockDurationStartTime": "2024-05-05T00:56:06.208000+00:00",
                "LockExpiresOn": "2025-05-05T00:56:06.208000+00:00"
            }
        ]
    }

For more information, see `Snapshot lock <https://docs.aws.amazon.com/ebs/latest/userguide/ebs-snapshot-lock.html>`__ in the *Amazon EBS User Guide*.