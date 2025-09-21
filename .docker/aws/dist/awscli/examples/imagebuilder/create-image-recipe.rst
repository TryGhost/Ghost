**To create a recipe**

The following ``create-image-recipe`` example creates an image recipe using a JSON file. Components are installed in the order in which they are specified. ::

    aws imagebuilder create-image-recipe \
        --cli-input-json file://create-image-recipe.json

Contents of ``create-image-recipe.json``::

    {
        "name": "MyBasicRecipe",
        "description": "This example image recipe creates a Windows 2016 image.",
        "semanticVersion": "2019.12.03",
        "components": 
        [
            {
                "componentArn": "arn:aws:imagebuilder:us-west-2:123456789012:component/myexamplecomponent/2019.12.02/1"
            },
            {
                "componentArn": "arn:aws:imagebuilder:us-west-2:123456789012:component/myimportedcomponent/1.0.0/1"
            }
        ],
        "parentImage": "arn:aws:imagebuilder:us-west-2:aws:image/windows-server-2016-english-full-base-x86/xxxx.x.x"
    }

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "clientToken": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
        "imageRecipeArn": "arn:aws:imagebuilder:us-west-2:123456789012:image-recipe/mybasicrecipe/2019.12.03"
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.
