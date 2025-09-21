**Example 1: To lock a snapshot in governance mode**

The following ``lock-snapshot`` example locks the specified snapshot in governance mode. ::

    aws ec2 lock-snapshot \
        --snapshot-id snap-0b5e733b4a8df6e0d \
        --lock-mode governance \
        --lock-duration 365

Output::

    {
        "SnapshotId": "snap-0b5e733b4a8df6e0d",
        "LockState": "governance",
        "LockDuration": 365,
        "LockCreatedOn": "2024-05-05T00:56:06.208000+00:00",
        "LockExpiresOn": "2025-05-05T00:56:06.208000+00:00",
        "LockDurationStartTime": "2024-05-05T00:56:06.208000+00:00"
    }

For more information, see `Snapshot lock <https://docs.aws.amazon.com/ebs/latest/userguide/ebs-snapshot-lock.html>`__ in the *Amazon EBS User Guide*.

**Example 2: To lock a snapshot in compliance mode**

The following ``lock-snapshot`` example lock the specified snapshot in compliance mode. ::

    aws ec2 lock-snapshot \
        --snapshot-id snap-0163a8524c5b9901f \
        --lock-mode compliance \
        --cool-off-period 24 \
        --lock-duration 365

Output::

    {
        "SnapshotId": "snap-0b5e733b4a8df6e0d",
        "LockState": "compliance-cooloff",
        "LockDuration": 365,
        "CoolOffPeriod": 24,
        "CoolOffPeriodExpiresOn": "2024-05-06T01:02:20.527000+00:00",
        "LockCreatedOn": "2024-05-05T01:02:20.527000+00:00",
        "LockExpiresOn": "2025-05-05T01:02:20.527000+00:00",
        "LockDurationStartTime": "2024-05-05T01:02:20.527000+00:00"
    }

For more information, see `Snapshot lock <https://docs.aws.amazon.com/ebs/latest/userguide/ebs-snapshot-lock.html>`__ in the *Amazon EBS User Guide*.