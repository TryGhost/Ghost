**To describe fast snapshot restores**

The following ``describe-fast-snapshot-restores`` example displays details for all fast snapshot restores with a state of ``disabled``. ::

  aws ec2 describe-fast-snapshot-restores \
      --filters Name=state,Values=disabled

Output::

    {
        "FastSnapshotRestores": [
            {
                "SnapshotId": "snap-1234567890abcdef0",
                "AvailabilityZone": "us-west-2c",
                "State": "disabled",
                "StateTransitionReason": "Client.UserInitiated - Lifecycle state transition",
                "OwnerId": "123456789012",
                "EnablingTime": "2020-01-25T23:57:49.596Z",
                "OptimizingTime": "2020-01-25T23:58:25.573Z",
                "EnabledTime": "2020-01-25T23:59:29.852Z",
                "DisablingTime": "2020-01-26T00:40:56.069Z",
                "DisabledTime": "2020-01-26T00:41:27.390Z"
            }
        ]
    }

The following ``describe-fast-snapshot-restores`` example describes all fast snapshot restores. ::

    aws ec2 describe-fast-snapshot-restores 
