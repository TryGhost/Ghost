**To remove tags from a data store.**

The following ``untag-resource`` example shows how to remove tags from a data store. ::

    aws healthlake untag-resource \
        --resource-arn "arn:aws:healthlake:us-east-1:123456789012:datastore/fhir/b91723d65c6fdeb1d26543a49d2ed1fa" \
        --tag-keys '["key1"]'

This command produces no output.

For more information, see `Removing tags from a data store <https://docs.aws.amazon.com/healthlake/latest/devguide/remove-tags.html>`__ in the *AWS HealthLake Developer Guide*.