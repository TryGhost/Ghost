**To cancel a deployment**

The following ``cancel-deployment`` example stops a continuous deployment to a thing group. ::

    aws greengrassv2 cancel-deployment \
        --deployment-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "message": "SUCCESS"
    }

For more information, see `Cancel deployments <https://docs.aws.amazon.com/greengrass/v2/developerguide/cancel-deployments.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.