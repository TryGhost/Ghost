**To describe all available options**

The following ``describe-option-group-options`` example lists two options for an Oracle Database 19c instance. ::

    aws rds describe-option-group-options \
        --engine-name oracle-ee \
        --major-engine-version 19 \
        --max-items 2

Output::

    {
        "OptionGroupOptions": [
            {
                "Name": "APEX",
                "Description": "Oracle Application Express Runtime Environment",
                "EngineName": "oracle-ee",
                "MajorEngineVersion": "19",
                "MinimumRequiredMinorEngineVersion": "0.0.0.ru-2019-07.rur-2019-07.r1",
                "PortRequired": false,
                "OptionsDependedOn": [],
                "OptionsConflictsWith": [],
                "Persistent": false,
                "Permanent": false,
                "RequiresAutoMinorEngineVersionUpgrade": false,
                "VpcOnly": false,
                "SupportsOptionVersionDowngrade": false,
                "OptionGroupOptionSettings": [],
                "OptionGroupOptionVersions": [
                    {
                        "Version": "19.1.v1",
                        "IsDefault": true
                    },
                    {
                        "Version": "19.2.v1",
                        "IsDefault": false
                    }
                ]
            },
            {
                "Name": "APEX-DEV",
                "Description": "Oracle Application Express Development Environment",
                "EngineName": "oracle-ee",
                "MajorEngineVersion": "19",
                "MinimumRequiredMinorEngineVersion": "0.0.0.ru-2019-07.rur-2019-07.r1",
                "PortRequired": false,
                "OptionsDependedOn": [
                    "APEX"
                ],
                "OptionsConflictsWith": [],
                "Persistent": false,
                "Permanent": false,
                "RequiresAutoMinorEngineVersionUpgrade": false,
                "VpcOnly": false,
                "OptionGroupOptionSettings": []
            }
        ],
        "NextToken": "eyJNYXJrZXIiOiBudWxsLCAiYm90b190cnVuY2F0ZV9hbW91bnQiOiAyfQ=="
    }

For more information, see `Listing the Options and Option Settings for an Option Group <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithOptionGroups.html#USER_WorkingWithOptionGroups.ListOption>`__ in the *Amazon RDS User Guide*.