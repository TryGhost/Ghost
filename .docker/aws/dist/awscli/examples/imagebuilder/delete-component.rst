**To delete a component**

The following ``delete-component`` example deletes a component build version by specifying its ARN. ::

    aws imagebuilder delete-component \
        --component-build-version-arn arn:aws:imagebuilder:us-west-2:123456789012:component/myexamplecomponent/2019.12.02/1

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "componentBuildVersionArn": "arn:aws:imagebuilder:us-west-2:123456789012:component/myexamplecomponent/2019.12.02/1"
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.
