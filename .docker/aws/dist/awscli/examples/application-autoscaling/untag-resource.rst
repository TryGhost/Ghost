**To remove a tag from a scalable target**

The following ``untag-resource`` example removes the tag pair with the key name ``environment`` from the scalable target specified by its ARN. ::

    aws application-autoscaling untag-resource \
        --resource-arn arn:aws:application-autoscaling:us-west-2:123456789012:scalable-target/1234abcd56ab78cd901ef1234567890ab123 \
        --tag-keys "environment"

This command produces no output.

For more information, see `Tagging support for Application Auto Scaling <https://docs.aws.amazon.com/autoscaling/application/userguide/resource-tagging-support.html>`__ in the *Application Auto Scaling User Guide*.
