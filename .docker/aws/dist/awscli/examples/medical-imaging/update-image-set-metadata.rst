**Example 1: To insert or update an attribute in image set metadata**

The following ``update-image-set-metadata`` example inserts or updates an attribute in image set metadata. ::

    aws medical-imaging update-image-set-metadata \
        --datastore-id 12345678901234567890123456789012 \
        --image-set-id ea92b0d8838c72a3f25d00d13616f87e \
        --latest-version-id 1 \
        --cli-binary-format raw-in-base64-out \
        --update-image-set-metadata-updates file://metadata-updates.json

Contents of ``metadata-updates.json`` ::

    {
        "DICOMUpdates": {
            "updatableAttributes": "{\"SchemaVersion\":1.1,\"Patient\":{\"DICOM\":{\"PatientName\":\"MX^MX\"}}}"
        }
    }

Output::

    {
        "latestVersionId": "2",
        "imageSetWorkflowStatus": "UPDATING",
        "updatedAt": 1680042257.908,
        "imageSetId": "ea92b0d8838c72a3f25d00d13616f87e",
        "imageSetState": "LOCKED",
        "createdAt": 1680027126.436,
        "datastoreId": "12345678901234567890123456789012"
    }

**Example 2: To remove an attribute from image set metadata**

The following ``update-image-set-metadata`` example removes an attribute from image set metadata. ::

    aws medical-imaging update-image-set-metadata \
        --datastore-id 12345678901234567890123456789012 \
        --image-set-id ea92b0d8838c72a3f25d00d13616f87e \
        --latest-version-id 1 \
        --cli-binary-format raw-in-base64-out \
        --update-image-set-metadata-updates file://metadata-updates.json

Contents of ``metadata-updates.json`` ::

    {
        "DICOMUpdates": {
            "removableAttributes": "{\"SchemaVersion\":1.1,\"Study\":{\"DICOM\":{\"StudyDescription\":\"CHEST\"}}}"
        }
    }

Output::

    {
        "latestVersionId": "2",
        "imageSetWorkflowStatus": "UPDATING",
        "updatedAt": 1680042257.908,
        "imageSetId": "ea92b0d8838c72a3f25d00d13616f87e",
        "imageSetState": "LOCKED",
        "createdAt": 1680027126.436,
        "datastoreId": "12345678901234567890123456789012"
    }

**Example 3: To remove an instance from image set metadata**

The following ``update-image-set-metadata`` example removes an instance from image set metadata. ::

    aws medical-imaging update-image-set-metadata \
        --datastore-id 12345678901234567890123456789012 \
        --image-set-id ea92b0d8838c72a3f25d00d13616f87e \
        --latest-version-id 1 \
        --cli-binary-format raw-in-base64-out \
        --update-image-set-metadata-updates file://metadata-updates.json

Contents of ``metadata-updates.json`` ::

    {
        "DICOMUpdates": {
            "removableAttributes": "{\"SchemaVersion\": 1.1,\"Study\": {\"Series\": {\"1.1.1.1.1.1.12345.123456789012.123.12345678901234.1\": {\"Instances\": {\"1.1.1.1.1.1.12345.123456789012.123.12345678901234.1\": {}}}}}}"
        }
    }

Output::

    {
        "latestVersionId": "2",
        "imageSetWorkflowStatus": "UPDATING",
        "updatedAt": 1680042257.908,
        "imageSetId": "ea92b0d8838c72a3f25d00d13616f87e",
        "imageSetState": "LOCKED",
        "createdAt": 1680027126.436,
        "datastoreId": "12345678901234567890123456789012"
    }


**Example 4: To revert an image set to a previous version**

The following ``update-image-set-metadata`` example shows how to revert an image set to a prior version. CopyImageSet and UpdateImageSetMetadata actions create new versions of image sets. ::

    aws medical-imaging update-image-set-metadata \
        --datastore-id 12345678901234567890123456789012 \
        --image-set-id 53d5fdb05ca4d46ac7ca64b06545c66e \
        --latest-version-id 3 \
        --cli-binary-format raw-in-base64-out \
        --update-image-set-metadata-updates '{"revertToVersionId": "1"}'

Output::

    {
        "datastoreId": "12345678901234567890123456789012",
        "imageSetId": "53d5fdb05ca4d46ac7ca64b06545c66e",
        "latestVersionId": "4",
        "imageSetState": "LOCKED",
        "imageSetWorkflowStatus": "UPDATING",
        "createdAt": 1680027126.436,
        "updatedAt": 1680042257.908
    }

**Example 5: To add a private DICOM data element to an instance**

The following ``update-image-set-metadata`` example shows how to add a private element to a specified instance within an image set. The DICOM standard permits private data elements for communication of information that cannot be contained in standard data elements. You can create, update, and delete private data elements with the
UpdateImageSetMetadata action. ::

    aws medical-imaging update-image-set-metadata \
        --datastore-id 12345678901234567890123456789012 \
        --image-set-id 53d5fdb05ca4d46ac7ca64b06545c66e \
        --latest-version-id 1 \
        --cli-binary-format raw-in-base64-out \
        --force \
        --update-image-set-metadata-updates file://metadata-updates.json

Contents of ``metadata-updates.json`` ::

    {
        "DICOMUpdates": {
            "updatableAttributes": "{\"SchemaVersion\": 1.1,\"Study\": {\"Series\": {\"1.1.1.1.1.1.12345.123456789012.123.12345678901234.1\": {\"Instances\": {\"1.1.1.1.1.1.12345.123456789012.123.12345678901234.1\": {\"DICOM\": {\"001910F9\": \"97\"},\"DICOMVRs\": {\"001910F9\": \"DS\"}}}}}}}"
        }
    }

Output::

    {
        "latestVersionId": "2",
        "imageSetWorkflowStatus": "UPDATING",
        "updatedAt": 1680042257.908,
        "imageSetId": "53d5fdb05ca4d46ac7ca64b06545c66e",
        "imageSetState": "LOCKED",
        "createdAt": 1680027126.436,
        "datastoreId": "12345678901234567890123456789012"
    }

**Example 6: To update a private DICOM data element to an instance**

The following ``update-image-set-metadata`` example shows how to update the value of a private data element belonging to an instance within an image set. ::

    aws medical-imaging update-image-set-metadata \
        --datastore-id 12345678901234567890123456789012 \
        --image-set-id 53d5fdb05ca4d46ac7ca64b06545c66e \
        --latest-version-id 1 \
        --cli-binary-format raw-in-base64-out \
        --force \
        --update-image-set-metadata-updates file://metadata-updates.json

Contents of ``metadata-updates.json`` ::

    {
        "DICOMUpdates": {
            "updatableAttributes": "{\"SchemaVersion\": 1.1,\"Study\": {\"Series\": {\"1.1.1.1.1.1.12345.123456789012.123.12345678901234.1\": {\"Instances\": {\"1.1.1.1.1.1.12345.123456789012.123.12345678901234.1\": {\"DICOM\": {\"00091001\": \"GE_GENESIS_DD\"}}}}}}}"
        }
    }

Output::

    {
        "latestVersionId": "2",
        "imageSetWorkflowStatus": "UPDATING",
        "updatedAt": 1680042257.908,
        "imageSetId": "53d5fdb05ca4d46ac7ca64b06545c66e",
        "imageSetState": "LOCKED",
        "createdAt": 1680027126.436,
        "datastoreId": "12345678901234567890123456789012"
    }

**Example 7: To update a SOPInstanceUID with the force parameter**

The following ``update-image-set-metadata`` example shows how to update a SOPInstanceUID, using the force parameter to override the DICOM metadata constraints. ::

    aws medical-imaging update-image-set-metadata \
            --datastore-id 12345678901234567890123456789012 \
            --image-set-id 53d5fdb05ca4d46ac7ca64b06545c66e \
            --latest-version-id 1 \
            --cli-binary-format raw-in-base64-out \
            --force \
            --update-image-set-metadata-updates file://metadata-updates.json

Contents of ``metadata-updates.json`` ::

    {
        "DICOMUpdates": {
            "updatableAttributes": "{\"SchemaVersion\":1.1,\"Study\":{\"Series\":{\"1.3.6.1.4.1.5962.99.1.3633258862.2104868982.1369432891697.3656.0\":{\"Instances\":{\"1.3.6.1.4.1.5962.99.1.3633258862.2104868982.1369432891697.3659.0\":{\"DICOM\":{\"SOPInstanceUID\":\"1.3.6.1.4.1.5962.99.1.3633258862.2104868982.1369432891697.3659.9\"}}}}}}}"
        }
    }

Output::

    {
        "latestVersionId": "2",
        "imageSetWorkflowStatus": "UPDATING",
        "updatedAt": 1680042257.908,
        "imageSetId": "53d5fdb05ca4d46ac7ca64b06545c66e",
        "imageSetState": "LOCKED",
        "createdAt": 1680027126.436,
        "datastoreId": "12345678901234567890123456789012"
    }

For more information, see `Updating image set metadata <https://docs.aws.amazon.com/healthimaging/latest/devguide/update-image-set-metadata.html>`__ in the *AWS HealthImaging Developer Guide*.
