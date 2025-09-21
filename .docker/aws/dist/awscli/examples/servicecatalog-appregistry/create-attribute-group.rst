**To create an attribute group**

The following ``create-attribute-group`` example creates a new attribute group in your AWS account. ::

    aws servicecatalog-appregistry create-attribute-group \
        --name "ExampleAttributeGroup" \
        --attributes '{"SomeKey1":"SomeValue1","SomeKey2":"SomeValue2"}'

Output::

    {
        "attributeGroup": {
            "id": "01sj5xdwhbw54kejwnt09fnpcl",
            "arn": "arn:aws:servicecatalog:us-west-2:813737243517:/attribute-groups/01sj5xdwhbw54kejwnt09fnpcl",
            "name": "ExampleAttributeGroup",
            "creationTime": "2023-02-28T20:38:01.389000+00:00",
            "lastUpdateTime": "2023-02-28T20:38:01.389000+00:00",
            "tags": {}
        }
    }

For more information, see `Creating attribute groups <https://docs.aws.amazon.com/servicecatalog/latest/arguide/create-attr-groups.html>`__ in the *AWS Service Catalog AppRegistry Administrator Guide*.