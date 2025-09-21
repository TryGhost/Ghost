**To get a URL to download a component artifact**

The following ``get-component-version-artifact`` example gets a URL to download the local debug console component's JAR file. ::

    aws greengrassv2 get-component-version-artifact \
        --arn arn:aws:greengrass:us-west-2:aws:components:aws.greengrass.LocalDebugConsole:versions:2.0.3 \
        --artifact-name "Uvt6ZEzQ9TKiAuLbfXBX_APdY0TWks3uc46tHFHTzBM=/aws.greengrass.LocalDebugConsole.jar"

Output::

    {
        "preSignedUrl": "https://evergreencomponentmanageme-artifactbucket7410c9ef-g18n1iya8kwr.s3.us-west-2.amazonaws.com/public/aws.greengrass.LocalDebugConsole/2.0.3/s3/ggv2-component-releases-prod-pdx/EvergreenHttpDebugView/2ffc496ba41b39568968b22c582b4714a937193ee7687a45527238e696672521/aws.greengrass.LocalDebugConsole/aws.greengrass.LocalDebugConsole.jar?X-Amz-Security-Token=KwfLKSdEXAMPLE..."
    }

For more information, see `Manage components <https://docs.aws.amazon.com/greengrass/v2/developerguide/manage-components.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.