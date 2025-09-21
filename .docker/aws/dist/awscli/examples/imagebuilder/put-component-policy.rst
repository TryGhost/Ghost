**To apply a resource policy to a component**

The following ``put-component-policy`` command applies a resource policy to a build component to enable cross-account sharing of build components. We recommend you use the RAM CLI command ``create-resource-share``. If you use the EC2 Image Builder CLI command ``put-component-policy``, you must also use the RAM CLI command ``promote-resource-share-create-from-policy`` in order for the resource to be visible to all principals with whom the resource is shared. ::

    aws imagebuilder put-component-policy \
        --component-arn arn:aws:imagebuilder:us-west-2:123456789012:component/examplecomponent/2019.12.02/1 \
        --policy '{ "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Principal": { "AWS": [ "123456789012" ] }, "Action": [ "imagebuilder:GetComponent", "imagebuilder:ListComponents" ], "Resource": [ "arn:aws:imagebuilder:us-west-2:123456789012:component/examplecomponent/2019.12.02/1" ] } ] }'

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "componentArn": "arn:aws:imagebuilder:us-west-2:123456789012:component/examplecomponent/2019.12.02/1"
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.