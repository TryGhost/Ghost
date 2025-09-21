**To get image set properties**

The following ``get-image-set`` code example gets the properties for an image set. ::

    aws medical-imaging get-image-set \
        --datastore-id 12345678901234567890123456789012 \
        --image-set-id 18f88ac7870584f58d56256646b4d92b \
        --version-id 1

Output::

    {
        "versionId": "1",
        "imageSetWorkflowStatus": "COPIED",
        "updatedAt": 1680027253.471,
        "imageSetId": "18f88ac7870584f58d56256646b4d92b",
        "imageSetState": "ACTIVE",
        "createdAt": 1679592510.753,
        "datastoreId": "12345678901234567890123456789012"
    }


For more information, see `Getting image set properties <https://docs.aws.amazon.com/healthimaging/latest/devguide/get-image-set-properties.html>`__ in the *AWS HealthImaging Developer Guide*.
