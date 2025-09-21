**To remove tags from a resource**

The following ``untag-resource`` example removes the tags with the specified key names from the specified resource. ::

    aws iotanalytics untag-resource \
        --resource-arn "arn:aws:iotanalytics:us-west-2:123456789012:channel/mychannel" \
        --tag-keys "[\"Environment\"]"

This command produces no output.

For more information, see `UntagResource <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_UntagResource.html
>`__ in the *AWS IoT Analytics API Reference*.
