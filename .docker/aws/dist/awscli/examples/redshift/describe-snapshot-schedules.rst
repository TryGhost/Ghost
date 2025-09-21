**To describe snapshot schedules**

The following ``describe-snapshot-schedules`` example displays details for the specified cluster snapshot schedule. ::

    aws redshift describe-snapshot-schedules \
        --cluster-identifier mycluster \
        --schedule-identifier mysnapshotschedule

Output::

    {
        "SnapshotSchedules": [
            {
                "ScheduleDefinitions": [
                    "rate(12 hours)"
                ],
                "ScheduleIdentifier": "mysnapshotschedule",
                "ScheduleDescription": "My schedule description",
                "Tags": [],
                "AssociatedClusterCount": 1,
                "AssociatedClusters": [
                    {
                        "ClusterIdentifier": "mycluster",
                        "ScheduleAssociationState": "ACTIVE"
                    }
                ]
            }
        ]
    }

For more information, see `Automated Snapshot Schedules <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-snapshots.html#automated-snapshot-schedules>`__ in the *Amazon Redshift Cluster Management Guide*.
