**To update an attribute group**

The following ``update-attribute-group`` example updates a specific attribute group in your AWS account to include a descritption. ::

    aws servicecatalog-appregistry update-attribute-group \
        --attribute-group "ExampleAttributeGroup" \
        --description "This is an example attribute group"

Output::

    {
        "attributeGroup": {
            "id": "01sj5xdwhbw54kejwnt09fnpcl",
            "arn": "arn:aws:servicecatalog:us-west-2:813737243517:/attribute-groups/01sj5xdwhbw54kejwnt09fnpcl",
            "name": "ExampleAttributeGroup",
            "description": "This is an example attribute group",
            "creationTime": "2023-02-28T20:38:01.389000+00:00",
            "lastUpdateTime": "2023-02-28T21:02:04.559000+00:00",
            "tags": {
                "aws:servicecatalog:attributeGroupName": "ExampleAttributeGroup"
            }
        }
    }

For more information, see `Editing attribute groups <https://docs.aws.amazon.com/servicecatalog/latest/arguide/edit-attr-group.html>`__ in the *AWS Service Catalog AppRegistry Administrator Guide*.