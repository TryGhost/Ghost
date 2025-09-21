**To create an asset**

The following ``create-asset`` example creates a wind turbine asset from a wind turbine asset model. ::

    aws iotsitewise create-asset \
        --asset-model-id a1b2c3d4-5678-90ab-cdef-11111EXAMPLE \
        --asset-name "Wind Turbine 1"

Output::

    {
        "assetId": "a1b2c3d4-5678-90ab-cdef-33333EXAMPLE",
        "assetArn": "arn:aws:iotsitewise:us-west-2:123456789012:asset/a1b2c3d4-5678-90ab-cdef-33333EXAMPLE",
        "assetStatus": {
            "state": "CREATING"
        }
    }

For more information, see `Creating assets <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/create-assets.html>`__ in the *AWS IoT SiteWise User Guide*.