**To remove a tag from a resource**

The following ``untag-resource`` example removes a tag from a resource using a JSON file. ::

    aws imagebuilder untag-resource \
        --cli-input-json file://tag-resource.json

Contents of ``untag-resource.json``::

    {
        "resourceArn": "arn:aws:imagebuilder:us-west-2:123456789012:image-pipeline/mywindows2016pipeline",
        "tagKeys": [
            "KeyName"
        ]
    }

This command produces no output.

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.
