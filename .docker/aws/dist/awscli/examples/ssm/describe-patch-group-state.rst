**To get the state of a patch group**

The following ``describe-patch-group-state`` example retrieves the high-level patch compliance summary for a patch group. ::

    aws ssm describe-patch-group-state \
        --patch-group "Production"

Output::

    {
        "Instances": 21,
        "InstancesWithCriticalNonCompliantPatches": 1,
        "InstancesWithFailedPatches": 2,
        "InstancesWithInstalledOtherPatches": 3,
        "InstancesWithInstalledPatches": 21,
        "InstancesWithInstalledPendingRebootPatches": 2,
        "InstancesWithInstalledRejectedPatches": 1,
        "InstancesWithMissingPatches": 3,
        "InstancesWithNotApplicablePatches": 4,
        "InstancesWithOtherNonCompliantPatches": 1,
        "InstancesWithSecurityNonCompliantPatches": 1,
        "InstancesWithUnreportedNotApplicablePatches": 2
    }

For more information, see `About patch groups` <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-patch-patchgroups.html>__ and `Understanding patch compliance state values <https://docs.aws.amazon.com/systems-manager/latest/userguide/about-patch-compliance-states.html>`__ in the *AWS Systems Manager User Guide*.