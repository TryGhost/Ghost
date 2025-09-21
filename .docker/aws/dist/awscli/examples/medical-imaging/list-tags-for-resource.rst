**Example 1: To list resource tags for a data store**

The following ``list-tags-for-resource`` code example lists tags for a data store. ::

    aws medical-imaging list-tags-for-resource \
        --resource-arn "arn:aws:medical-imaging:us-east-1:123456789012:datastore/12345678901234567890123456789012"

Output::

    {
        "tags":{
            "Deployment":"Development"
        }
    }

**Example 2: To list resource tags for an image set**

The following ``list-tags-for-resource`` code example lists tags for an image set. ::


    aws medical-imaging list-tags-for-resource \
        --resource-arn "arn:aws:medical-imaging:us-east-1:123456789012:datastore/12345678901234567890123456789012/imageset/18f88ac7870584f58d56256646b4d92b"

Output::

    {
        "tags":{
            "Deployment":"Development"
        }
    }

For more information, see `Tagging resources with AWS HealthImaging <https://docs.aws.amazon.com/healthimaging/latest/devguide/tagging.html>`__ in the *AWS HealthImaging Developer Guide*.
