**Example 1: To add a CORS policy**

The following ``put-cors-policy`` example adds a cross-origin resource sharing (CORS) policy to the specified container. The contents of the CORS policy are in the file named ``corsPolicy.json``. ::

    aws mediastore put-cors-policy \
        --container-name ExampleContainer \
        --cors-policy file://corsPolicy.json

This command produces no output.

For more information, see `Adding a CORS Policy to a Container <https://docs.aws.amazon.com/mediastore/latest/ug/cors-policy-adding.html>`__ in the *AWS Elemental MediaStore User Guide*.

**Example 2: To edit a CORS policy**

The following ``put-cors-policy`` example updates the cross-origin resource sharing (CORS) policy that is assigned to the specified container. The contents of the updated CORS policy are in the file named ``corsPolicy2.json``.

For more information, see `Editing a CORS Policy <https://docs.aws.amazon.com/mediastore/latest/ug/cors-policy-editing.html>`__ in the *AWS Elemental MediaStore User Guide*.
