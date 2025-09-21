**Example 1: To copy an image set without a destination.**

The following ``copy-image-set`` example makes a duplicate copy of an image set without a destination. ::

    aws medical-imaging copy-image-set \
        --datastore-id 12345678901234567890123456789012 \
        --source-image-set-id ea92b0d8838c72a3f25d00d13616f87e \
        --copy-image-set-information '{"sourceImageSet": {"latestVersionId": "1" } }'

Output::

    {
        "destinationImageSetProperties": {
            "latestVersionId": "2",
            "imageSetWorkflowStatus": "COPYING",
            "updatedAt": 1680042357.432,
            "imageSetId": "b9a06fef182a5f992842f77f8e0868e5",
            "imageSetState": "LOCKED",
            "createdAt": 1680042357.432
        },
        "sourceImageSetProperties": {
            "latestVersionId": "1",
            "imageSetWorkflowStatus": "COPYING_WITH_READ_ONLY_ACCESS",
            "updatedAt": 1680042357.432,
            "imageSetId": "ea92b0d8838c72a3f25d00d13616f87e",
            "imageSetState": "LOCKED",
            "createdAt": 1680027126.436
        },
        "datastoreId": "12345678901234567890123456789012"
    }

**Example 2: To copy an image set with a destination.**

The following ``copy-image-set`` example makes a duplicate copy of an image set with a destination. ::

    aws medical-imaging copy-image-set \
        --datastore-id 12345678901234567890123456789012 \
        --source-image-set-id ea92b0d8838c72a3f25d00d13616f87e \
        --copy-image-set-information '{"sourceImageSet": {"latestVersionId": "1" }, "destinationImageSet": { "imageSetId": "b9a06fef182a5f992842f77f8e0868e5", "latestVersionId": "1"} }'

Output::

    {
        "destinationImageSetProperties": {
            "latestVersionId": "2",
            "imageSetWorkflowStatus": "COPYING",
            "updatedAt": 1680042505.135,
            "imageSetId": "b9a06fef182a5f992842f77f8e0868e5",
            "imageSetState": "LOCKED",
            "createdAt": 1680042357.432
        },
        "sourceImageSetProperties": {
            "latestVersionId": "1",
            "imageSetWorkflowStatus": "COPYING_WITH_READ_ONLY_ACCESS",
            "updatedAt": 1680042505.135,
            "imageSetId": "ea92b0d8838c72a3f25d00d13616f87e",
            "imageSetState": "LOCKED",
            "createdAt": 1680027126.436
        },
        "datastoreId": "12345678901234567890123456789012"
    }

**Example 3: To copy a subset of instances from a source image set to a destination image set.**

The following ``copy-image-set`` example copies one DICOM instance from the source image set to the destination image set.
The force parameter is provided to override inconsistencies in the Patient, Study, and Series level attributes. ::

    aws medical-imaging copy-image-set \
        --datastore-id 12345678901234567890123456789012 \
        --source-image-set-id ea92b0d8838c72a3f25d00d13616f87e \
        --copy-image-set-information '{"sourceImageSet": {"latestVersionId": "1","DICOMCopies": {"copiableAttributes": "{\"SchemaVersion\":\"1.1\",\"Study\":{\"Series\":{\"1.3.6.1.4.1.5962.99.1.3673257865.2104868982.1369432891697.3666.0\":{\"Instances\":{\"1.3.6.1.4.1.5962.99.1.3673257865.2104868982.1369432891697.3669.0\":{}}}}}}"}},"destinationImageSet": {"imageSetId": "b9eb50d8ee682eb9fcf4acbf92f62bb7","latestVersionId": "1"}}' \
        --force

Output::

    {
        "destinationImageSetProperties": {
            "latestVersionId": "2",
            "imageSetWorkflowStatus": "COPYING",
            "updatedAt": 1680042505.135,
            "imageSetId": "b9eb50d8ee682eb9fcf4acbf92f62bb7",
            "imageSetState": "LOCKED",
            "createdAt": 1680042357.432
        },
        "sourceImageSetProperties": {
            "latestVersionId": "1",
            "imageSetWorkflowStatus": "COPYING_WITH_READ_ONLY_ACCESS",
            "updatedAt": 1680042505.135,
            "imageSetId": "ea92b0d8838c72a3f25d00d13616f87e",
            "imageSetState": "LOCKED",
            "createdAt": 1680027126.436
        },
        "datastoreId": "12345678901234567890123456789012"
    }

For more information, see `Copying an image set <https://docs.aws.amazon.com/healthimaging/latest/devguide/copy-image-set.html>`__ in the *AWS HealthImaging Developer Guide*.
