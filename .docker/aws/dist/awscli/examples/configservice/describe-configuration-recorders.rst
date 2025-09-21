**To get details about the configuration recorder**

The following command returns details about the default configuration recorder::

    aws configservice describe-configuration-recorders

Output::

    {
        "ConfigurationRecorders": [
            {
                "recordingGroup": {
                    "allSupported": true,
                    "resourceTypes": [],
                    "includeGlobalResourceTypes": true
                },
                "roleARN": "arn:aws:iam::123456789012:role/config-ConfigRole-A1B2C3D4E5F6",
                "name": "default"
            }
        ]
    }