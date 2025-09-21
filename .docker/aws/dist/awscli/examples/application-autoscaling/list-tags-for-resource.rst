**To list the tags for a scalable target**

The following ``list-tags-for-resource`` example lists the tag key names and values that are attached to the scalable target specified by its ARN. ::

    aws application-autoscaling list-tags-for-resource \
        --resource-arn arn:aws:application-autoscaling:us-west-2:123456789012:scalable-target/1234abcd56ab78cd901ef1234567890ab123

Output::

    {
        "Tags": {
            "environment": "production"
        }
    }

For more information, see `Tagging support for Application Auto Scaling <https://docs.aws.amazon.com/autoscaling/application/userguide/resource-tagging-support.html>`__ in the *Application Auto Scaling User Guide*.

