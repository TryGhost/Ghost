**To update an asset's name**

The following ``update-asset`` example updates a wind turbine asset's name. ::

    aws iotsitewise update-asset \
        --asset-id a1b2c3d4-5678-90ab-cdef-33333EXAMPLE \
        --asset-name "Wind Turbine 2"

Output::

    {
        "assetStatus": {
            "state": "UPDATING"
        }
    }

For more information, see `Updating assets <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/update-assets-and-models.html#update-assets>`__ in the *AWS IoT SiteWise User Guide*.