**To disassociate a child asset from a parent asset**

The following ``disassociate-assets`` example disassociates a wind turbine asset from a wind farm asset. ::

    aws iotsitewise disassociate-assets \
        --asset-id a1b2c3d4-5678-90ab-cdef-44444EXAMPLE \
        --hierarchy-id a1b2c3d4-5678-90ab-cdef-77777EXAMPLE \
        --child-asset-id a1b2c3d4-5678-90ab-cdef-33333EXAMPLE

This command produces no output.

For more information, see `Associating assets <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/add-associated-assets.html>`__ in the *AWS IoT SiteWise User Guide*.