**To edit a container policy**

The following ``put-container-policy`` example assigns a different policy to the specified container. In this example, the updated policy is defined in a file named ``LiveEventsContainerPolicy.json``. ::

    aws mediastore put-container-policy \
        --container-name LiveEvents \
        --policy file://LiveEventsContainerPolicy.json

This command produces no output.

For more information, see `Editing a Container Policy <https://docs.aws.amazon.com/mediastore/latest/ug/policies-edit.html>`__ in the *AWS Elemental MediaStore User Guide*.
