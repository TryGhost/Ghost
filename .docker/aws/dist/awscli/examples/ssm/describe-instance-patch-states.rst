**To get the patch summary states for instances**

This ``describe-instance-patch-states`` example gets the patch summary states for an instance. ::

    aws ssm describe-instance-patch-states \
        --instance-ids "i-1234567890abcdef0"

Output::

    {
        "InstancePatchStates": [
            {
                "InstanceId": "i-1234567890abcdef0",
                "PatchGroup": "my-patch-group",
                "BaselineId": "pb-0713accee01234567",            
                "SnapshotId": "521c3536-930c-4aa9-950e-01234567abcd",
                "CriticalNonCompliantCount": 2,
                "SecurityNonCompliantCount": 2,
                "OtherNonCompliantCount": 1,
                "InstalledCount": 123,
                "InstalledOtherCount": 334,
                "InstalledPendingRebootCount": 0,
                "InstalledRejectedCount": 0,
                "MissingCount": 1,
                "FailedCount": 2,
                "UnreportedNotApplicableCount": 11,
                "NotApplicableCount": 2063,
                "OperationStartTime": "2021-05-03T11:00:56-07:00",
                "OperationEndTime": "2021-05-03T11:01:09-07:00",
                "Operation": "Scan",
                "LastNoRebootInstallOperationTime": "2020-06-14T12:17:41-07:00",
                "RebootOption": "RebootIfNeeded"
            }
        ]
    }

For more information, see `About Patch Compliance <https://docs.aws.amazon.com/systems-manager/latest/userguide/about-patch-compliance.html>`__ in the *AWS Systems Manager User Guide*.