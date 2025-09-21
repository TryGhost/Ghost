**To unlock a snapshot**

The following ``unlock-snapshot`` example unlocks the specified snapshot. ::

    aws ec2 unlock-snapshot \
        --snapshot-id snap-0b5e733b4a8df6e0d

Output::

    {
        "SnapshotId": "snap-0b5e733b4a8df6e0d"
    }

For more information, see `Snapshot lock <https://docs.aws.amazon.com/ebs/latest/userguide/ebs-snapshot-lock.html>`__ in the *Amazon EBS User Guide*.
