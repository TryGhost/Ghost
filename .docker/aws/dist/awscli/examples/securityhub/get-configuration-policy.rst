**To view configuration policy details**

The following ``get-configuration-policy`` example retrieves details about the specified configuration policy. ::

    aws securityhub get-configuration-policy \
       --identifier "arn:aws:securityhub:eu-central-1:123456789012:configuration-policy/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"

Output::

    {
        "Arn": "arn:aws:securityhub:eu-central-1:123456789012:configuration-policy/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "Id": "ce5ed1e7-9639-4e2f-9313-fa87fcef944b",
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

For more information, see `Viewing Security Hub configuration policies <https://docs.aws.amazon.com/securityhub/latest/userguide/view-policy.html>`__ in the *AWS Security Hub User Guide*.