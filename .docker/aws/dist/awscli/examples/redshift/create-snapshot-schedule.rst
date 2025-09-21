**To create snapshot schedule**

The following ``create-snapshot-schedule`` example creates a snapshot schedule with the specified description and a rate of every 12 hours. ::

    aws redshift create-snapshot-schedule \
        --schedule-definitions "rate(12 hours)" \
        --schedule-identifier mysnapshotschedule \
        --schedule-description "My schedule description"

Output::

    {
        "ScheduleDefinitions": [
            "rate(12 hours)"
        ],
        "ScheduleIdentifier": "mysnapshotschedule",
        "ScheduleDescription": "My schedule description",
        "Tags": []
    }

For more information, see `Automated Snapshot Schedules <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-snapshots.html#automated-snapshot-schedules>`__ in the *Amazon Redshift Cluster Management Guide*.
