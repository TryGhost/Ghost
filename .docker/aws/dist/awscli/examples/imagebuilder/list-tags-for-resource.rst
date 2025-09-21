**To list tags for a specific resource**

The following ``list-tags-for-resource`` example lists all of the tags for a specific resource. ::

    aws imagebuilder list-tags-for-resource \
        --resource-arn arn:aws:imagebuilder:us-west-2:123456789012:image-pipeline/mywindows2016pipeline

Output::

    {
        "tags": {
            "KeyName": "KeyValue"
        }
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.
