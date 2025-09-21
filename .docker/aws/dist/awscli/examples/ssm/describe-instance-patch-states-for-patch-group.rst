**Example 1: To get the instance states for a patch group**

The following ``describe-instance-patch-states-for-patch-group`` example retrieves details about the patch summary states per-instance for the specified patch group. ::

    aws ssm describe-instance-patch-states-for-patch-group \
        --patch-group "Production"

Output::

    {
        "InstancePatchStates": [
            {
                "InstanceId": "i-02573cafcfEXAMPLE",
                "PatchGroup": "Production",
                "BaselineId": "pb-0c10e65780EXAMPLE",
                "SnapshotId": "a3f5ff34-9bc4-4d2c-a665-4d1c1EXAMPLE",
                "OwnerInformation": "",
                "InstalledCount": 32,
                "InstalledOtherCount": 1,
                "InstalledPendingRebootCount": 0,
                "InstalledRejectedCount": 0,
                "MissingCount": 2,
                "FailedCount": 0,
                "UnreportedNotApplicableCount": 2671,
                "NotApplicableCount": 400,
                "OperationStartTime": "2021-08-04T11:03:50.590000-07:00",
                "OperationEndTime": "2021-08-04T11:04:21.555000-07:00",
                "Operation": "Scan",
                "RebootOption": "NoReboot",
                "CriticalNonCompliantCount": 0,
                "SecurityNonCompliantCount": 1,
                "OtherNonCompliantCount": 0
            },
            {
                "InstanceId": "i-0471e04240EXAMPLE",
                "PatchGroup": "Production",
                "BaselineId": "pb-09ca3fb51fEXAMPLE",
                "SnapshotId": "05d8ffb0-1bbe-4812-ba2d-d9b7bEXAMPLE",
                "OwnerInformation": "",
                "InstalledCount": 32,
                "InstalledOtherCount": 1,
                "InstalledPendingRebootCount": 0,
                "InstalledRejectedCount": 0,
                "MissingCount": 2,
                "FailedCount": 0,
                "UnreportedNotApplicableCount": 2671,
                "NotApplicableCount": 400,
                "OperationStartTime": "2021-08-04T22:06:20.340000-07:00",
                "OperationEndTime": "2021-08-04T22:07:11.220000-07:00",
                "Operation": "Scan",
                "RebootOption": "NoReboot",
                "CriticalNonCompliantCount": 0,
                "SecurityNonCompliantCount": 1,
                "OtherNonCompliantCount": 0
            }
        ]
    }

**Example 2: To get the instance states for a patch group with more than five missing patches**

The following ``describe-instance-patch-states-for-patch-group`` example retrieves details about the patch summary states for the specified patch group for instances with more than five missing patches. ::

    aws ssm describe-instance-patch-states-for-patch-group \
        --filters Key=MissingCount,Type=GreaterThan,Values=5 \
        --patch-group "Production"

Output::

    {
        "InstancePatchStates": [
            {
                "InstanceId": "i-02573cafcfEXAMPLE",
                "PatchGroup": "Production",
                "BaselineId": "pb-0c10e65780EXAMPLE",
                "SnapshotId": "a3f5ff34-9bc4-4d2c-a665-4d1c1EXAMPLE",
                "OwnerInformation": "",
                "InstalledCount": 46,
                "InstalledOtherCount": 4,
                "InstalledPendingRebootCount": 1,
                "InstalledRejectedCount": 1,
                "MissingCount": 7,
                "FailedCount": 0,
                "UnreportedNotApplicableCount": 232,
                "NotApplicableCount": 654,
                "OperationStartTime": "2021-08-04T11:03:50.590000-07:00",
                "OperationEndTime": "2021-08-04T11:04:21.555000-07:00",
                "Operation": "Scan",
                "RebootOption": "NoReboot",
                "CriticalNonCompliantCount": 0,
                "SecurityNonCompliantCount": 1,
                "OtherNonCompliantCount": 1
            }
        ]
    }


**Example 3: To get the instance states for a patch group with fewer than ten instances that require a reboot**

The following ``describe-instance-patch-states-for-patch-group`` example retrieves details about the patch summary states for the specified patch group for instances with fewer than ten instances requiring a reboot. ::

    aws ssm describe-instance-patch-states-for-patch-group \
        --filters Key=InstalledPendingRebootCount,Type=LessThan,Values=10 \
        --patch-group "Production"

Output::

    {
        "InstancePatchStates": [
            {
                "InstanceId": "i-02573cafcfEXAMPLE",
                "BaselineId": "pb-0c10e65780EXAMPLE",
                "SnapshotId": "a3f5ff34-9bc4-4d2c-a665-4d1c1EXAMPLE",
                "PatchGroup": "Production",
                "OwnerInformation": "",
                "InstalledCount": 32,
                "InstalledOtherCount": 1,
                "InstalledPendingRebootCount": 4,
                "InstalledRejectedCount": 0,
                "MissingCount": 2,
                "FailedCount": 0,
                "UnreportedNotApplicableCount": 846,
                "NotApplicableCount": 212,
                "OperationStartTime": "2021-08-046T11:03:50.590000-07:00",
                "OperationEndTime": "2021-08-06T11:04:21.555000-07:00",
                "Operation": "Scan",
                "RebootOption": "NoReboot",
                "CriticalNonCompliantCount": 0,
                "SecurityNonCompliantCount": 1,
                "OtherNonCompliantCount": 0
            }
        ]
    }

For more information, see `Understanding patch compliance state values <https://docs.aws.amazon.com/systems-manager/latest/userguide/about-patch-compliance-states.html>`__ in the *AWS Systems Manager User Guide*.