**To describe the available option groups**

The following ``describe-option-groups`` example lists the options groups for an Oracle Database 19c instance. ::

    aws rds describe-option-groups \
        --engine-name oracle-ee \
        --major-engine-version 19

Output::

    {
        "OptionGroupsList": [
            {
                "OptionGroupName": "default:oracle-ee-19",
                "OptionGroupDescription": "Default option group for oracle-ee 19",
                "EngineName": "oracle-ee",
                "MajorEngineVersion": "19",
                "Options": [],
                "AllowsVpcAndNonVpcInstanceMemberships": true,
                "OptionGroupArn": "arn:aws:rds:us-west-1:111122223333:og:default:oracle-ee-19"
            }
        ]
    }

For more information, see `Listing the Options and Option Settings for an Option Group <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithOptionGroups.html#USER_WorkingWithOptionGroups.ListOption>`__ in the *Amazon RDS User Guide*.
