**To enable fast snapshot restore**

The following ``enable-fast-snapshot-restores`` example enables fast snapshot restore for the specified snapshot in the specified Availability Zones. ::

  aws ec2 enable-fast-snapshot-restores \
      --availability-zones us-east-2a us-east-2b \
      --source-snapshot-ids snap-1234567890abcdef0

Output::

    {
        "Successful": [
            {
                "SnapshotId": "snap-1234567890abcdef0"
                "AvailabilityZone": "us-east-2a",
                "State": "enabling",
                "StateTransitionReason": "Client.UserInitiated",
                "OwnerId": "123456789012",
                "EnablingTime": "2020-01-25T23:57:49.602Z"
            },
            {
                "SnapshotId": "snap-1234567890abcdef0"
                "AvailabilityZone": "us-east-2b",
                "State": "enabling",
                "StateTransitionReason": "Client.UserInitiated",
                "OwnerId": "123456789012",
                "EnablingTime": "2020-01-25T23:57:49.596Z"
            }
        ],
        "Unsuccessful": []
    }
