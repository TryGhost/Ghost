**To delete a container policy**

The following ``delete-container-policy`` example deletes the policy that is assigned to the specified container. When the policy is deleted, AWS Elemental MediaStore automatically assigns the default policy to the container. ::

    aws mediastore delete-container-policy \
        --container-name LiveEvents

This command produces no output.

For more information, see `DeleteContainerPolicy <https://docs.aws.amazon.com/mediastore/latest/apireference/API_DeleteContainerPolicy.html>`__ in the *AWS Elemental MediaStore API reference*.
