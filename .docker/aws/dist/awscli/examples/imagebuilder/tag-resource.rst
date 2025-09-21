**To tag a resource**

The following ``tag-resource`` example adds and tags a resource to EC2 Image Builder using a JSON file. ::

    aws imagebuilder tag-resource \
        --cli-input-json file://tag-resource.json

Contents of ``tag-resource.json``::

    {
        "resourceArn": "arn:aws:imagebuilder:us-west-2:123456789012:image-pipeline/mywindows2016pipeline",
        "tags": {
            "KeyName: "KeyValue"
        }
    }

This command produces no output.

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.