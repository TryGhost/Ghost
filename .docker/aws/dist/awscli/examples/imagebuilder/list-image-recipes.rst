**To list image recipes**

The following ``list-image-recipes`` example lists all of your image recipes. ::

    aws imagebuilder list-image-recipes

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "imageRecipeSummaryList": [
            {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:image-recipe/mybasicrecipe/2019.12.03",
                "name": "MyBasicRecipe",
                "platform": "Windows",
                "owner": "123456789012",
                "parentImage": "arn:aws:imagebuilder:us-west-2:aws:image/windows-server-2016-english-full-base-x86/2019.x.x",
                "dateCreated": "2020-02-19T18:54:25.975Z",
                "tags": {
                    "KeyName": "KeyValue"
                }
            },
            {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:image-recipe/recipe-name-a1b2c3d45678/1.0.0",
                "name": "recipe-name-a1b2c3d45678",
                "platform": "Linux",
                "owner": "123456789012",
                "parentImage": "arn:aws:imagebuilder:us-west-2:aws:image/amazon-linux-2-x86/2019.11.21",
                "dateCreated": "2019-12-16T18:19:00.120Z",
                "tags": {
                    "KeyName": "KeyValue"
                }
            }
        ]
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.
