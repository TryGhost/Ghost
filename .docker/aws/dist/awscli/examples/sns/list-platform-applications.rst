**To list platform applications**

The following ``list-platform-applications`` example lists the platform applications for ADM and MPNS. ::

    aws sns list-platform-applications

Output::

    {
        "PlatformApplications": [
            {
                "PlatformApplicationArn": "arn:aws:sns:us-west-2:123456789012:app/ADM/MyApplication",
                "Attributes": {
                    "SuccessFeedbackSampleRate": "100",
                    "Enabled": "true"
                }
            },
            {
                "PlatformApplicationArn": "arn:aws:sns:us-west-2:123456789012:app/MPNS/MyOtherApplication",
                "Attributes": {
                    "SuccessFeedbackSampleRate": "100",
                    "Enabled": "true"
                }
            }
        ]
    }
