**To list the platform application attributes**

The following ``get-platform-application-attributes`` example lists the attributes for the specified platform application. ::

    aws sns get-platform-application-attributes \
        --platform-application-arn arn:aws:sns:us-west-2:123456789012:app/MPNS/MyApplication

Output::

    {
        "Attributes": {
            "Enabled": "true",
            "SuccessFeedbackSampleRate": "100"
        }
    }
