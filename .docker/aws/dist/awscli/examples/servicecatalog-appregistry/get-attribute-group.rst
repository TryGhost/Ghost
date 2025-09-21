**To get an attribute group**

The following ``get-attribute-group`` example retrieves a specific attribute group in your AWS account. ::

    aws servicecatalog-appregistry get-attribute-group \
        --attribute-group "ExampleAttributeGroup"

Output::

    {
        "id": "01sj5xdwhbw54kejwnt09fnpcl",
        "arn": "arn:aws:servicecatalog:us-west-2:813737243517:/attribute-groups/01sj5xdwhbw54kejwnt09fnpcl",
        "name": "ExampleAttributeGroup",
        "attributes": "{\"SomeKey1\":\"SomeValue1\",\"SomeKey2\":\"SomeValue2\"}",
        "creationTime": "2023-02-28T20:38:01.389000+00:00",
        "lastUpdateTime": "2023-02-28T20:38:01.389000+00:00",
        "tags": {
            "aws:servicecatalog:attributeGroupName": "ExampleAttributeGroup"
        }
    }

For more information, see `Managing metadata for attribute groups <https://docs.aws.amazon.com/servicecatalog/latest/arguide/manage-metatdata.html>`__ in the *AWS Service Catalog AppRegistry Administrator Guide*.