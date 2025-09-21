**To wait for a portal to be active**

The following ``wait portal-active`` example pauses and resumes only after it can confirm that the specified portal is active. ::

    aws iotsitewise wait portal-active \
        --portal-id a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE

This command produces no output.

For more information, see `Administering your portals <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/administer-portals.html>`__ in the *AWS IoT SiteWise User Guide*.