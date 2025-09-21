**To list all tags for a resource**

The following ``list-tags-for-resource`` example lists all tags for a wind turbine asset. ::

    aws iotsitewise list-tags-for-resource \
        --resource-arn arn:aws:iotsitewise:us-west-2:123456789012:asset/a1b2c3d4-5678-90ab-cdef-33333EXAMPLE

Output::

    {
        "tags": {
            "Owner": "richard-roe"
        }
    }

For more information, see `Tagging your resources <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/tag-resources.html>`__ in the *AWS IoT SiteWise User Guide*.