**To wait for a portal to not exist**

The following ``wait portal-not-exists`` example pauses and resumes only after it can confirm that the specified portal doesn't exist. ::

    aws iotsitewise wait portal-not-exists \
        --portal-id a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE

This command produces no output.

For more information, see `Administering your portals <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/administer-portals.html>`__ in the *AWS IoT SiteWise User Guide*.