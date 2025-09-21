**Example 1: To display the default Windows patch baseline**

The following ``get-default-patch-baseline`` example retrieves details for the default patch baseline for Windows Server. ::

    aws ssm get-default-patch-baseline

Output::

    {
      "BaselineId": "pb-0713accee01612345",
      "OperatingSystem": "WINDOWS"
    }

**Example 2: To display the default patch baseline for Amazon Linux**

The following ``get-default-patch-baseline`` example retrieves details for the default patch baseline for Amazon Linux. ::

    aws ssm get-default-patch-baseline \
        --operating-system AMAZON_LINUX

Output::

    {
        "BaselineId": "pb-047c6eb9c8fc12345",
        "OperatingSystem": "AMAZON_LINUX"
    }

For more information, see `About Predefined and Custom Patch Baselines` <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-patch-baselines.html>__ and `Set an Existing Patch Baseline as the Default <https://docs.aws.amazon.com/systems-manager/latest/userguide/set-default-patch-baseline.html>`__ in the *AWS Systems Manager User Guide*.
