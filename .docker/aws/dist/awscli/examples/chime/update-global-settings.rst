**To update global settings**

The following ``update-global-settings`` example updates the S3 bucket used to store call detail records for Amazon Chime Business Calling and Amazon Chime Voice Connectors associated with the administrator's AWS account. ::

    aws chime update-global-settings \
        --business-calling CdrBucket="s3bucket" \
        --voice-connector CdrBucket="s3bucket"

This command produces no output.

For more information, see `Managing Global Settings <https://docs.aws.amazon.com/chime/latest/ag/manage-global.html>`__ in the *Amazon Chime Administration Guide*.
