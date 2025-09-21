**To copy an option group**

The following ``copy-option-group`` example makes a copy of an option group. :: 

    aws rds copy-option-group \
        --source-option-group-identifier myoptiongroup \
        --target-option-group-identifier new-option-group \
        --target-option-group-description "My option group copy"

Output::

    {
        "OptionGroup": {
            "Options": [],
            "OptionGroupName": "new-option-group",
            "MajorEngineVersion": "11.2",
            "OptionGroupDescription": "My option group copy",
            "AllowsVpcAndNonVpcInstanceMemberships": true,
            "EngineName": "oracle-ee",
            "OptionGroupArn": "arn:aws:rds:us-east-1:123456789012:og:new-option-group"
        }
    }

For more information, see `Making a Copy of an Option Group <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithOptionGroups.html#USER_WorkingWithOptionGroups.Copy>`__ in the *Amazon RDS User Guide*.
