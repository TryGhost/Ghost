**To delete snapshot schedule**

The following ``delete-snapshot-schedule`` example deletes the specified snapshot schedule. You must disassociate clusters before deleting the schedule. ::

    aws redshift delete-snapshot-schedule \
        --schedule-identifier mysnapshotschedule

This command does not produce any output.

For more information, see `Automated Snapshot Schedules <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-snapshots.html#automated-snapshot-schedules>`__ in the *Amazon Redshift Cluster Management Guide*.
