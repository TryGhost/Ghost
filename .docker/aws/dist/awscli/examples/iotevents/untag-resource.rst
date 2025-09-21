**To remove tags from a resource**

The following ``untag-resource`` example removes the tag with the specified key name from the specified resource. ::

    aws iotevents untag-resource \
        --resource-arn arn:aws:iotevents:us-west-2:123456789012:input/PressureInput \
        --tagkeys deviceType

This command produces no output.

For more information, see `UntagResource <https://docs.aws.amazon.com/iotevents/latest/apireference/API_UntagResource>`__ in the *AWS IoT Events API Reference*.
