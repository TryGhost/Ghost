**To list images**

The following ``list-images`` example lists all of the semantic versions you have access to. ::

    aws imagebuilder list-images

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "imageVersionList": [
            {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:image/mybasicrecipe/2019.12.03",
                "name": "MyBasicRecipe",
                "version": "2019.12.03",
                "platform": "Windows",
                "owner": "123456789012",
                "dateCreated": "2020-02-14T21:29:18.810Z"
            }
        ]
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.
