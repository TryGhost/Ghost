**To list image set versions**

The following ``list-image-set-versions`` code example lists the version history for an image set. ::

    aws medical-imaging list-image-set-versions \
        --datastore-id 12345678901234567890123456789012 \
        --image-set-id ea92b0d8838c72a3f25d00d13616f87e

Output::

    {
        "imageSetPropertiesList": [
            {
                "ImageSetWorkflowStatus": "UPDATED",
                "versionId": "4",
                "updatedAt": 1680029436.304,
                "imageSetId": "ea92b0d8838c72a3f25d00d13616f87e",
                "imageSetState": "ACTIVE",
                "createdAt": 1680027126.436
            },
            {
                "ImageSetWorkflowStatus": "UPDATED",
                "versionId": "3",
                "updatedAt": 1680029163.325,
                "imageSetId": "ea92b0d8838c72a3f25d00d13616f87e",
                "imageSetState": "ACTIVE",
                "createdAt": 1680027126.436
            },
            {
                "ImageSetWorkflowStatus": "COPY_FAILED",
                "versionId": "2",
                "updatedAt": 1680027455.944,
                "imageSetId": "ea92b0d8838c72a3f25d00d13616f87e",
                "imageSetState": "ACTIVE",
                "message": "INVALID_REQUEST:  Series of SourceImageSet and DestinationImageSet don't match.",
                "createdAt": 1680027126.436
            },
            {
                "imageSetId": "ea92b0d8838c72a3f25d00d13616f87e",
                "imageSetState": "ACTIVE",
                "versionId": "1",
                "ImageSetWorkflowStatus": "COPIED",
                "createdAt": 1680027126.436
            }
        ]
    }

For more information, see `Listing image set versions <https://docs.aws.amazon.com/healthimaging/latest/devguide/list-image-set-versions.html>`__ in the *AWS HealthImaging Developer Guide*.
