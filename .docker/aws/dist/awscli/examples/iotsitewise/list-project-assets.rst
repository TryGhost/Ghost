**To list all assets associated to a project**

The following ``list-project-assets`` example lists all assets that are associated to a wind farm project. ::

    aws iotsitewise list-projects \
        --project-id a1b2c3d4-5678-90ab-cdef-eeeeeEXAMPLE

Output::

    {
        "assetIds": [
            "a1b2c3d4-5678-90ab-cdef-44444EXAMPLE"
        ]
    }

For more information, see `Adding assets to projects <https://docs.aws.amazon.com/iot-sitewise/latest/appguide/add-assets-to-projects-sd.html>`__ in the *AWS IoT SiteWise Monitor Application Guide*.