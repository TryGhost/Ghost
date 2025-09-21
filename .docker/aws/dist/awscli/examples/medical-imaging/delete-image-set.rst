**To delete an image set**

The following ``delete-image-set`` code example deletes an image set. ::

    aws medical-imaging delete-image-set \
        --datastore-id 12345678901234567890123456789012 \
        --image-set-id ea92b0d8838c72a3f25d00d13616f87e

Output::

    {
        "imageSetWorkflowStatus": "DELETING",
        "imageSetId": "ea92b0d8838c72a3f25d00d13616f87e",
        "imageSetState": "LOCKED",
        "datastoreId": "12345678901234567890123456789012"
    }

For more information, see `Deleting an image set <https://docs.aws.amazon.com/healthimaging/latest/devguide/delete-image-set.html>`__ in the *AWS HealthImaging Developer Guide*.
