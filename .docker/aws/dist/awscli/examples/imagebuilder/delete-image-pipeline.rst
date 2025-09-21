**To delete an image pipeline**

The following ``delete-image-pipeline`` example deletes an image pipeline by specifying its ARN. ::

    aws imagebuilder delete-image-pipeline \
        --image-pipeline-arn arn:aws:imagebuilder:us-west-2:123456789012:image-pipeline/my-example-pipeline

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "imagePipelineArn": "arn:aws:imagebuilder:us-west-2:123456789012:image-pipeline/mywindows2016pipeline"
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.