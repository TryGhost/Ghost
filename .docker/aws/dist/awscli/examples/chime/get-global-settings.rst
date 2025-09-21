**To get global settings**

The following ``get-global-settings`` example retrieves the S3 bucket names used to store call detail records for Amazon Chime Business Calling and Amazon Chime Voice Connectors associated with the administrator's AWS account. ::

    aws chime get-global-settings

Output::

    {
        "BusinessCalling": {
            "CdrBucket": "s3bucket"
        },
        "VoiceConnector": {
            "CdrBucket": "s3bucket"
        }
    }

For more information, see `Managing Global Settings <https://docs.aws.amazon.com/chime/latest/ag/manage-global.html>`__ in the *Amazon Chime Administration Guide*.
