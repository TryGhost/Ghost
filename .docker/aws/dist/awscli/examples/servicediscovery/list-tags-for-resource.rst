**To list tags associated with the specified resource**

The following ``list-tags-for-resource`` example lists tags for the specified resource. ::

    aws servicediscovery list-tags-for-resource \
        --resource-arn arn:aws:servicediscovery:us-west-2:123456789012:namespace/ns-e4anhexample0004

Output::

    {
        "Tags": [
            {
                "Key": "Project",
                "Value": "Zeta"
            },
            {
                "Key": "Department",
                "Value": "Engineering"
            }
        ]
    }

For more information, see `Tagging your AWS Cloud Map resources <https://docs.aws.amazon.com/cloud-map/latest/dg/listing-instances.html>`__ in the *AWS Cloud Map Developer Guide*.
