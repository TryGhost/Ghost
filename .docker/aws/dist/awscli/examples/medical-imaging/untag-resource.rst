**Example 1: To untag a data store**

The following ``untag-resource`` code example untags a data store. ::

    aws medical-imaging untag-resource \
        --resource-arn "arn:aws:medical-imaging:us-east-1:123456789012:datastore/12345678901234567890123456789012" \
        --tag-keys '["Deployment"]'


This command produces no output.

**Example 2: To untag an image set**

The following ``untag-resource`` code example untags an image set. ::

    aws medical-imaging untag-resource \
        --resource-arn "arn:aws:medical-imaging:us-east-1:123456789012:datastore/12345678901234567890123456789012/imageset/18f88ac7870584f58d56256646b4d92b" \
        --tag-keys '["Deployment"]'


This command produces no output.

For more information, see `Tagging resources with AWS HealthImaging <https://docs.aws.amazon.com/healthimaging/latest/devguide/tagging.html>`__ in the *AWS HealthImaging Developer Guide*.

