**To delete an asset model**

The following ``delete-asset-model`` example deletes a wind turbine asset model. ::

    aws iotsitewise delete-asset-model \
        --asset-model-id a1b2c3d4-5678-90ab-cdef-11111EXAMPLE

Output::

    {
        "assetModelStatus": {
            "state": "DELETING"
        }
    }

For more information, see `Deleting asset models <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/delete-assets-and-models.html#delete-asset-models>`__ in the *AWS IoT SiteWise User Guide*.