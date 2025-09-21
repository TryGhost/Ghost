**Example 1: To permanently restore an archived snapshot**

The following ``restore-snapshot-tier`` example permanently restores the specified snapshot. Specify the ``--snapshot-id`` and include the ``permanent-restore`` option. ::

    aws ec2 restore-snapshot-tier \
        --snapshot-id snap-01234567890abcedf \
        --permanent-restore

Output::

    {
        "SnapshotId": "snap-01234567890abcedf",
        "IsPermanentRestore": true
    }

For more information about snapshot archiving, see `Archive Amazon EBS snapshots <https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-archive.html>`__ in the *Amazon EBS User Guide*.

**Example 2: To temporarily restore an archived snapshot**

The following ``restore-snapshot-tier`` example temporarily restores the specified snapshot. Omit the ``--permanent-restore`` option. Specify the ``--snapshot-id`` and, for ``temporary-restore-days``, specify the number of days for which to restore the snapshot. ``temporary-restore-days`` must be specified in days. The allowed range is ``1`` to ``180``. If you do not specify a value, it defaults to ``1`` day. ::

    aws ec2 restore-snapshot-tier \
        --snapshot-id snap-01234567890abcedf \
        --temporary-restore-days 5

Output::

    {
        "SnapshotId": "snap-01234567890abcedf",
        "RestoreDuration": 5,
        "IsPermanentRestore": false
    }

For more information about snapshot archiving, see `Archive Amazon EBS snapshots <https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-archive.html>`__ in the *Amazon EBS User Guide*.

**Example 3: To modify the restore period**

The following ``restore-snapshot-tier`` example changes the restore period for the specified snapshot to ``10`` days. ::

    aws ec2 restore-snapshot-tier \
        --snapshot-id snap-01234567890abcedf 
        --temporary-restore-days 10

Output::

    {
        "SnapshotId": "snap-01234567890abcedf",
        "RestoreDuration": 10,
        "IsPermanentRestore": false
    }

For more information about snapshot archiving, see `Archive Amazon EBS snapshots <https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-archive.html>`__ in the *Amazon EBS User Guide*.

**Example 4: To modify the restore type**

The following ``restore-snapshot-tier`` example changes the restore type for the specified snapshot from temporary to permanent. ::

    aws ec2 restore-snapshot-tier \
        --snapshot-id snap-01234567890abcedf 
        --permanent-restore

Output::

    {
        "SnapshotId": "snap-01234567890abcedf",
        "IsPermanentRestore": true
    }

For more information about snapshot archiving, see `Archive Amazon EBS snapshots <https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-archive.html>`__ in the *Amazon EBS User Guide*.
