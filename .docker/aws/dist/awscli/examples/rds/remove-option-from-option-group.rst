**To delete an option from an option group**

The following ``remove-option-from-option-group`` example removes the ``OEM`` option from ``myoptiongroup``. ::

    aws rds remove-option-from-option-group \
        --option-group-name myoptiongroup \
        --options OEM \
        --apply-immediately

Output::

    {
        "OptionGroup": {
            "OptionGroupName": "myoptiongroup",
            "OptionGroupDescription": "Test",
            "EngineName": "oracle-ee",
            "MajorEngineVersion": "19",
            "Options": [],
            "AllowsVpcAndNonVpcInstanceMemberships": true,
            "OptionGroupArn": "arn:aws:rds:us-east-1:123456789012:og:myoptiongroup"
        }
    }

For more information, see `Removing an Option from an Option Group <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithOptionGroups.html#USER_WorkingWithOptionGroups.RemoveOption>`__ in the *Amazon Aurora User Guide*.
