**To Create an Amazon RDS option group**

The following ``create-option-group`` command creates a new Amazon RDS option group for ``Oracle Enterprise Edition`` version ``11.2`, is named ``MyOptionGroup`` and includes a description. ::

    aws rds create-option-group \
        --option-group-name MyOptionGroup \
        --engine-name oracle-ee \
        --major-engine-version 11.2 \
        --option-group-description "Oracle Database Manager Database Control" 

Output::

    {
        "OptionGroup": {
            "OptionGroupName": "myoptiongroup",
            "OptionGroupDescription": "Oracle Database Manager Database Control",
            "EngineName": "oracle-ee",
            "MajorEngineVersion": "11.2",
            "Options": [],
            "AllowsVpcAndNonVpcInstanceMemberships": true,
            "OptionGroupArn": "arn:aws:rds:us-west-2:123456789012:og:myoptiongroup"
        }
    }
