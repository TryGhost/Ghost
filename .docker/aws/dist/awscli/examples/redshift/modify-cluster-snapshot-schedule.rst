**To modify cluster snapshot schedule**

The following ``modify-cluster-snapshot-schedule`` example removes the specified snapshot schedule from the specified cluster. ::

    aws redshift modify-cluster-snapshot-schedule \
        --cluster-identifier mycluster \
        --schedule-identifier mysnapshotschedule \
        --disassociate-schedule

This command does not produce any output.

For more information, see `Automated Snapshot Schedules <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-snapshots.html#automated-snapshot-schedules>`__ in the *Amazon Redshift Cluster Management Guide*.
