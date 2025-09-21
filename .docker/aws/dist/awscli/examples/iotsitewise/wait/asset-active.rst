**To wait for an asset to be active**

The following ``wait asset-active`` example pauses and resumes only after it can confirm that the specified asset is active. ::

    aws iotsitewise wait asset-active \
        --asset-id a1b2c3d4-5678-90ab-cdef-33333EXAMPLE

This command produces no output.

For more information, see `Asset and model states <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/asset-and-model-states.html>`__ in the *AWS IoT SiteWise User Guide*.