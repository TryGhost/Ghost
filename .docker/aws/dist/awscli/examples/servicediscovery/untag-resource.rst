**To remove tags from the specified resource**

The following ``untag-resource`` example removes a ``Department`` tag from the specified namespace. ::

    aws servicediscovery untag-resource \
        --resource-arn arn:aws:servicediscovery:us-west-2:123456789012:namespace/ns-e4anhexample0004 \
        --tags Key=Department, Value=Engineering

This command produces no output.

For more information, see `Tagging your AWS Cloud Map resources <https://docs.aws.amazon.com/cloud-map/latest/dg/listing-instances.html>`__ in the *AWS Cloud Map Developer Guide*.
