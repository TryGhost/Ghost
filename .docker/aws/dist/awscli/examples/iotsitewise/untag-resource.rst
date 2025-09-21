**To remove a tag from a resource**

The following ``untag-resource`` example removes an owner tag from a wind turbine asset. ::

    aws iotsitewise untag-resource \
        --resource-arn arn:aws:iotsitewise:us-west-2:123456789012:asset/a1b2c3d4-5678-90ab-cdef-33333EXAMPLE \
        --tag-keys Owner

This command produces no output.

For more information, see `Tagging your resources <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/tag-resources.html>`__ in the *AWS IoT SiteWise User Guide*.