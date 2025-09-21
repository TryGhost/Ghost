**Example 8: To delete an attribute group**

The following ``delete-attribute-group`` example deletes a specific attribute group in your AWS account. ::

    aws servicecatalog-appregistry delete-attribute-group \
        --attribute-group "ExampleAttributeGroup3"

Output::

    {
        "attributeGroup": {
            "id": "011ge6y3emyjijt8dw8jn6r0hv",
            "arn": "arn:aws:servicecatalog:us-west-2:813737243517:/attribute-groups/011ge6y3emyjijt8dw8jn6r0hv",
            "name": "ExampleAttributeGroup3",
            "creationTime": "2023-02-28T22:05:35.224000+00:00",
            "lastUpdateTime": "2023-02-28T22:05:35.224000+00:00"
        }
    }

For more information, see `Deleting attribute groups <https://docs.aws.amazon.com/servicecatalog/latest/arguide/delete-attr-group.html>`__ in the *AWS Service Catalog AppRegistry Administrator Guide*.