**To add tags to a container**

The following ``tag-resource`` example adds tag keys and values to the specified container. ::

    aws mediastore tag-resource \
        --resource arn:aws:mediastore:us-west-2:123456789012:container/ExampleContainer \
        --tags '[{"Key": "Region", "Value": "West"}, {"Key": "Environment", "Value": "Test"}]'

This command produces no output.

For more information, see `TagResource <https://docs.aws.amazon.com/mediastore/latest/apireference/API_TagResource.html>`__ in the *AWS Elemental MediaStore API Reference*.
