**To wait for an asset to not exist**

The following ``wait asset-not-exists`` example pauses and resumes only after it can confirm that the specified asset doesn't exist. ::

    aws iotsitewise wait asset-not-exists \
        --asset-id a1b2c3d4-5678-90ab-cdef-33333EXAMPLE

This command produces no output.

For more information, see `Deleting assets <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/delete-assets-and-models.html#delete-assets>`__ in the *AWS IoT SiteWise User Guide*.