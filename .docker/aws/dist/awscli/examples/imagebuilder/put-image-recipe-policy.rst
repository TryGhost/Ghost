**To apply a resource policy to an image recipe**

The following ``put-image-recipe-policy`` command applies a resource policy to an image recipe to enable cross-account sharing of image recipes. We recommend that you use the RAM CLI command ``create-resource-share``. If you use the EC2 Image Builder CLI command ``put-image-recipe-policy``, you must also use the RAM CLI command ``promote-resource-share-create-from-policy`` in order for the resource to be visible to all principals with whom the resource is shared. ::

    aws imagebuilder put-image-recipe-policy \
        --image-recipe-arn arn:aws:imagebuilder:us-west-2:123456789012:image-recipe/example-image-recipe/2019.12.02 \
        --policy '{ "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Principal": { "AWS": [ "123456789012" ] }, "Action": [ "imagebuilder:GetImageRecipe", "imagebuilder:ListImageRecipes" ], "Resource": [ "arn:aws:imagebuilder:us-west-2:123456789012:image-recipe/example-image-recipe/2019.12.02" ] } ] }'

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "imageRecipeArn": "arn:aws:imagebuilder:us-west-2:123456789012:image-recipe/example-image-recipe/2019.12.02/1"
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.