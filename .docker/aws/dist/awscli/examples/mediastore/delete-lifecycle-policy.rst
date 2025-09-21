**To delete an object lifecycle policy**

The following ``delete-lifecycle-policy`` example deletes the object lifecycle policy attached to the specified container. This change can take up to 20 minutes to take effect. ::

    aws mediastore delete-lifecycle-policy \
        --container-name LiveEvents

This command produces no output.

For more information, see `Deleting an Object Lifecycle Policy <https://docs.aws.amazon.com/mediastore/latest/ug/policies-object-lifecycle-delete.html>`__ in the *AWS Elemental MediaStore User Guide*.
