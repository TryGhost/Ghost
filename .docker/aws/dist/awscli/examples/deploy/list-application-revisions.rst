**To get information about application revisions**

The following ``list-application-revisions`` example displays information about all application revisions that are associated with the specified application. ::

    aws deploy list-application-revisions \
        --application-name WordPress_App \
        --s-3-bucket CodeDeployDemoBucket \
        --deployed exclude \
        --s-3-key-prefix WordPress_ \
        --sort-by lastUsedTime \
        --sort-order descending

Output::

    {
        "revisions": [
            {
                "revisionType": "S3",
                "s3Location": {
                    "version": "uTecLusvCB_JqHFXtfUcyfV8bEXAMPLE",
                    "bucket": "CodeDeployDemoBucket",
                    "key": "WordPress_App.zip",
                    "bundleType": "zip"
                }
            },
            {
                "revisionType": "S3",
                "s3Location": {
                    "version": "tMk.UxgDpMEVb7V187ZM6wVAWEXAMPLE",
                    "bucket": "CodeDeployDemoBucket",
                    "key": "WordPress_App_2-0.zip",
                    "bundleType": "zip"
                }
            }
        ]
    }
