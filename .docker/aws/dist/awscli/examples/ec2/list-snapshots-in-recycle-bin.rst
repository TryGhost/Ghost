**To view snapshots in the Recycle Bin**

The following ``list-snapshots-in-recycle-bin`` example lists information about snapshots in the Recycle Bin, including the snapshot ID, a description of the snapshot, The ID of the volume from which the snapshot was created, the date and time when the snapshot was deleted and it entered the Recycle Bin, and the date and time when the retention period expires. ::

    aws ec2 list-snapshots-in-recycle-bin \
        --snapshot-id snap-01234567890abcdef

Output::

    {
        "SnapshotRecycleBinInfo": [
            {
                "Description": "Monthly data backup snapshot",
                "RecycleBinEnterTime": "2022-12-01T13:00:00.000Z",
                "RecycleBinExitTime": "2022-12-15T13:00:00.000Z",
                "VolumeId": "vol-abcdef09876543210",
                "SnapshotId": "snap-01234567890abcdef"
            }
        ]
    }

For more information about Recycle Bin, see `Recover deleted snapshots from the Recycle Bin <https://docs.aws.amazon.com/ebs/latest/userguide/recycle-bin-working-with-snaps.html>`__ in the *Amazon EBS User Guide*.
