**To create a configuration policy**

The following ``create-configuration-policy`` example creates a configuration policy with the specified settings. ::

    aws securityhub create-configuration-policy \
        --name "SampleConfigurationPolicy" \
        --description "SampleDescription" \
        --configuration-policy '{"SecurityHub": {"ServiceEnabled": true, "EnabledStandardIdentifiers": ["arn:aws:securityhub:eu-central-1::standards/aws-foundational-security-best-practices/v/1.0.0","arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0"],"SecurityControlsConfiguration":{"DisabledSecurityControlIdentifiers": ["CloudTrail.2"], "SecurityControlCustomParameters": [{"SecurityControlId": "ACM.1", "Parameters": {"daysToExpiration": {"ValueType": "CUSTOM", "Value": {"Integer": 15}}}}]}}}' \
        --tags '{"Environment": "Prod"}'

Output::

    {
        "Arn": "arn:aws:securityhub:eu-central-1:123456789012:configuration-policy/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "Id": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "Name": "SampleConfigurationPolicy",
        "Description": "SampleDescription",
        "UpdatedAt": "2023-11-28T20:28:04.494000+00:00",
        "CreatedAt": "2023-11-28T20:28:04.494000+00:00",
        "ConfigurationPolicy": {
            "SecurityHub": {
                "ServiceEnabled": true,
                "EnabledStandardIdentifiers": [
                    "arn:aws:securityhub:eu-central-1::standards/aws-foundational-security-best-practices/v/1.0.0",
                    "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0"
                ],
                "SecurityControlsConfiguration": {
                    "DisabledSecurityControlIdentifiers": [
                        "CloudTrail.2"
                    ],
                    "SecurityControlCustomParameters": [
                        {
                            "SecurityControlId": "ACM.1",
                            "Parameters": {
                                "daysToExpiration": {
                                    "ValueType": "CUSTOM",
                                    "Value": {
                                        "Integer": 15
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        }
    }

For more information, see `Creating and associating Security Hub configuration policies <https://docs.aws.amazon.com/securityhub/latest/userguide/create-associate-policy.html>`__ in the *AWS Security Hub User Guide*.