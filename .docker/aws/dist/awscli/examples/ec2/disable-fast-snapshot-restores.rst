**To disable fast snapshot restore**

The following ``disable-fast-snapshot-restores`` example disables fast snapshot restore for the specified snapshot in the specified Availability Zone. ::

  aws ec2 disable-fast-snapshot-restores \
      --availability-zones us-east-2a \
      --source-snapshot-ids snap-1234567890abcdef0

Output::

    {
        "Successful": [
            {
                "SnapshotId": "snap-1234567890abcdef0"
                "AvailabilityZone": "us-east-2a",
                "State": "disabling",
                "StateTransitionReason": "Client.UserInitiated",
                "OwnerId": "123456789012",
                "EnablingTime": "2020-01-25T23:57:49.602Z"
            }
        ],
        "Unsuccessful": []
    }
