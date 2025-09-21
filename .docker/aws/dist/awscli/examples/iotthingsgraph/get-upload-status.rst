**To get the status of your entity upload**

The following ``get-upload-status`` example gets the status of your entity upload operation. The value of ``MyUploadId`` is the ID value returned by the ``upload-entity-definitions`` operation. ::

    aws iotthingsgraph get-upload-status \
        --upload-id "MyUploadId"

Output::

    {
        "namespaceName": "us-west-2/123456789012/default",
        "namespaceVersion": 5,
        "uploadId": "f6294f1e-b109-4bbe-9073-f451a2dda2da",
        "uploadStatus": "SUCCEEDED"
    }

For more information, see `Modeling Entities <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-modelmanagement.html>`__ in the *AWS IoT Things Graph User Guide*.
