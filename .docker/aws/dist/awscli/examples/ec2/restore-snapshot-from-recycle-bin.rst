**To restore snapshots from the Recycle Bin**

The following ``restore-snapshot-from-recycle-bin`` example restores a snapshot from the Recycle Bin. When you restore a snapshot from the Recycle Bin, the snapshot is immediately available for use, and it is removed from the Recycle Bin. You can use a restored snapshot in the same way that you use any other snapshot in your account. ::

    aws ec2 restore-snapshot-from-recycle-bin \
        --snapshot-id snap-01234567890abcdef

This command produces no output.

For more information about Recycle Bin, see `Recover deleted snapshots from the Recycle Bin <https://docs.aws.amazon.com/ebs/latest/userguide/recycle-bin-working-with-snaps.html>`__ in the *Amazon EBS User Guide*.
