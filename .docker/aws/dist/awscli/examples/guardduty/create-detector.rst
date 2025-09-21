**To enable GuardDuty in the current region**

This example shows how to create a new detector, which enables GuardDuty, in the current region.::

    aws guardduty create-detector \
        --enable

Output::

    {
        "DetectorId": "b6b992d6d2f48e64bc59180bfexample"
    }

For more information, see `Enable Amazon GuardDuty <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_settingup.html#guardduty_enable-gd>`__ in the *GuardDuty User Guide*.
