**Example 1: To tag a data store**

The following ``tag-resource`` code examples tags a data store. ::

    aws medical-imaging tag-resource \
      --resource-arn "arn:aws:medical-imaging:us-east-1:123456789012:datastore/12345678901234567890123456789012" \
      --tags '{"Deployment":"Development"}'

This command produces no output.

**Example 2: To tag an image set**

The following ``tag-resource`` code examples tags an image set. ::

    aws medical-imaging tag-resource \
        --resource-arn "arn:aws:medical-imaging:us-east-1:123456789012:datastore/12345678901234567890123456789012/imageset/18f88ac7870584f58d56256646b4d92b" \
        --tags '{"Deployment":"Development"}'

This command produces no output.

For more information, see `Tagging resources with AWS HealthImaging <https://docs.aws.amazon.com/healthimaging/latest/devguide/tagging.html>`__ in the *AWS HealthImaging Developer Guide*.

