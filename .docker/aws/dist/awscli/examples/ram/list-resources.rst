**To list the resources associated with a resource share**

The following ``list-resources`` example lists all resources in the specified resource share that are of the specified resource type. ::

    aws ram list-resources \
        --resource-type ec2:Subnet \ 
        --resource-owner SELF \
        --resource-share-arn arn:aws:ram:us-west-2:123456789012:resource-share/7ab63972-b505-7e2a-420d-6f5d3EXAMPLE

Output::

    {
        "resources": [
            {
                "arn": "aarn:aws:ec2:us-west-2:123456789012:subnet/subnet-0250c25a1f4e15235",
                "type": "ec2:Subnet",
                "resourceShareArn": "arn:aws:ram:us-west-2:123456789012:resource-share/7ab63972-b505-7e2a-420d-6f5d3EXAMPLE",
                "creationTime": 1565301545.023,
                "lastUpdatedTime": 1565301545.947
            }
        ]
    }
