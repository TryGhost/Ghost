**To add a tag to a scalable target**

The following ``tag-resource`` example adds a tag with the key name ``environment`` and the value ``production`` to the scalable target specified by its ARN. ::

    aws application-autoscaling tag-resource \
        --resource-arn arn:aws:application-autoscaling:us-west-2:123456789012:scalable-target/1234abcd56ab78cd901ef1234567890ab123 \
        --tags environment=production

This command produces no output.

For more information, see `Tagging support for Application Auto Scaling <https://docs.aws.amazon.com/autoscaling/application/userguide/resource-tagging-support.html>`__ in the *Application Auto Scaling User Guide*.
