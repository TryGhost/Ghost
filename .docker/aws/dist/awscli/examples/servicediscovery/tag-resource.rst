**To associate tags with the specified resource**

The following ``tag-resource`` example associates a ``Department`` tag with the value ``Engineering`` with the specified namespace. ::

    aws servicediscovery tag-resource \
        --resource-arn arn:aws:servicediscovery:us-west-2:123456789012:namespace/ns-e4anhexample0004 \
        --tags Key=Department, Value=Engineering

This command produces no output.

For more information, see `Tagging your AWS Cloud Map resources <https://docs.aws.amazon.com/cloud-map/latest/dg/listing-instances.html>`__ in the *AWS Cloud Map Developer Guide*.
