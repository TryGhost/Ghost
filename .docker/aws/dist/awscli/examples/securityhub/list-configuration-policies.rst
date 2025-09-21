**To list configuration policy summaries**

The following ``list-configuration-policies`` example lists a summary of configuration policies for the organization. ::

    aws securityhub list-configuration-policies \
        --max-items 3

Output::

    {
        "ConfigurationPolicySummaries": [
            {
                "Arn": "arn:aws:securityhub:eu-central-1:123456789012:configuration-policy/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "Id": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "Name": "SampleConfigurationPolicy1",
                "Description": "SampleDescription1",
                "UpdatedAt": "2023-09-26T21:08:36.214000+00:00",
                "ServiceEnabled": true
            },
            {
                "Arn": "arn:aws:securityhub:eu-central-1:123456789012:configuration-policy/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "Id": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "Name": "SampleConfigurationPolicy2",
                "Description": "SampleDescription2"
                "UpdatedAt": "2023-11-28T19:26:25.207000+00:00",
                "ServiceEnabled": true
            },
            {
                "Arn": "arn:aws:securityhub:eu-central-1:123456789012:configuration-policy/a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "Id": "a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "Name": "SampleConfigurationPolicy3",
                "Description": "SampleDescription3",
                "UpdatedAt": "2023-11-28T20:28:04.494000+00:00",
                "ServiceEnabled": true
            }
    }

For more information, see `Viewing Security Hub configuration policies <https://docs.aws.amazon.com/securityhub/latest/userguide/view-policy.html>`__ in the *AWS Security Hub User Guide*.