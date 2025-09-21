**To add or modify tags for a resource**

The following ``tag-resource`` example adds to or modifies the tags attached to the specified resource. ::

    aws iotanalytics tag-resource \
        --resource-arn "arn:aws:iotanalytics:us-west-2:123456789012:channel/mychannel" \
        --tags "[{\"key\": \"Environment\", \"value\": \"Production\"}]"

This command produces no output.

For more information, see `TagResource <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_TagResource.html>`__ in the *AWS IoT Analytics API Reference*.
