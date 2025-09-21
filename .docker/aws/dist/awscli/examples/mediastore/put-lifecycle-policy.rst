**To create an object lifecycle policy**

The following ``put-lifecycle-policy`` example attaches an object lifecycle policy to the specified container. This enables you to specify how long the service should store objects in your container. MediaStore deletes objects in the container once they reach their expiration date, as indicated in the policy, which is in the file named ``LiveEventsLifecyclePolicy.json``. ::

    aws mediastore put-lifecycle-policy \
        --container-name ExampleContainer \
        --lifecycle-policy file://ExampleLifecyclePolicy.json

This command produces no output.

For more information, see `Adding an Object Lifecycle Policy to a Container <https://docs.aws.amazon.com/mediastore/latest/ug/policies-object-lifecycle-add.html>`__ in the *AWS Elemental MediaStore User Guide*.
