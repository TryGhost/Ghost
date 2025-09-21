**To update a configuration policy**

The following ``update-configuration-policy`` example updates an existing configuration policy to use the specified settings. ::

    aws securityhub update-configuration-policy \
        --identifier "arn:aws:securityhub:eu-central-1:508236694226:configuration-policy/09f37766-57d8-4ede-9d33-5d8b0fecf70e" \
        --name "SampleConfigurationPolicyUpdated" \
        --description "SampleDescriptionUpdated" \
        --configuration-policy '{"SecurityHub": {"ServiceEnabled": true, "EnabledStandardIdentifiers": ["arn:aws:securityhub:eu-central-1::standards/aws-foundational-security-best-practices/v/1.0.0","arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0"],"SecurityControlsConfiguration":{"DisabledSecurityControlIdentifiers": ["CloudWatch.1"], "SecurityControlCustomParameters": [{"SecurityControlId": "ACM.1", "Parameters": {"daysToExpiration": {"ValueType": "CUSTOM", "Value": {"Integer": 21}}}}]}}}' \
        --updated-reason "Disabling CloudWatch.1 and changing parameter value"

Output::

    {
        "Arn": "arn:aws:securityhub:eu-central-1:123456789012:configuration-policy/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "Id": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "Name": "SampleConfigurationPolicyUpdated",
        "Description": "SampleDescriptionUpdated",
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
                        "CloudWatch.1"
                    ],
                    "SecurityControlCustomParameters": [
                        {
                            "SecurityControlId": "ACM.1",
                            "Parameters": {
                                "daysToExpiration": {
                                    "ValueType": "CUSTOM",
                                    "Value": {
                                        "Integer": 21
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        }
    }

For more information, see `Updating Security Hub configuration policies <https://docs.aws.amazon.com/securityhub/latest/userguide/update-policy.html>`__ in the *AWS Security Hub User Guide*.