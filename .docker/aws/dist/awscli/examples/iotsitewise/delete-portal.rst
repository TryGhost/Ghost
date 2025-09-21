**To delete a portal**

The following ``delete-portal`` example deletes a web portal for a wind farm company. ::

    aws iotsitewise delete-portal \
        --portal-id a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE

Output::

    {
        "portalStatus": {
            "state": "DELETING"
        }
    }

For more information, see `Deleting a portal <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/administer-portals.html#portal-delete-portal>`__ in the *AWS IoT SiteWise User Guide*.