**To modify snapshot schedule**

The following ``modify-snapshot-schedule`` example modifies the rate of the specified snapshot schedule to every 10 hours. ::

    aws redshift modify-snapshot-schedule \
        --schedule-identifier mysnapshotschedule \
        --schedule-definitions "rate(10 hours)"

Output::

    {
        "ScheduleDefinitions": [
            "rate(10 hours)"
        ],
        "ScheduleIdentifier": "mysnapshotschedule",
        "ScheduleDescription": "My schedule description",
        "Tags": []
    }

For more information, see `Snapshot Schedule Format <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-snapshots.html#working-with-snapshot-scheduling>`__ in the *Amazon Redshift Cluster Management Guide*.
