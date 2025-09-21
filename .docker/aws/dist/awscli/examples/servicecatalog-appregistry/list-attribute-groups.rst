**To list attribute groups**

The following ``list-attribute-groups`` example retrieves a list of all attribute groups in your AWS account. ::

    aws servicecatalog-appregistry list-attribute-groups

Output::

    {
        "attributeGroups": [
            {
                "id": "011ge6y3emyjijt8dw8jn6r0hv",
                "arn": "arn:aws:servicecatalog:us-west-2:813737243517:/attribute-groups/011ge6y3emyjijt8dw8jn6r0hv",
                "name": "ExampleAttributeGroup3",
                "creationTime": "2023-02-28T22:05:35.224000+00:00",
                "lastUpdateTime": "2023-02-28T22:05:35.224000+00:00"
            },
            {
                "id": "01sj5xdwhbw54kejwnt09fnpcl",
                "arn": "arn:aws:servicecatalog:us-west-2:813737243517:/attribute-groups/01sj5xdwhbw54kejwnt09fnpcl",
                "name": "ExampleAttributeGroup",
                "description": "This is an example attribute group",
                "creationTime": "2023-02-28T20:38:01.389000+00:00",
                "lastUpdateTime": "2023-02-28T21:02:04.559000+00:00"
            },
            {
                "id": "03n1yffgq6d18vwrzxf0c70nm3",
                "arn": "arn:aws:servicecatalog:us-west-2:813737243517:/attribute-groups/03n1yffgq6d18vwrzxf0c70nm3",
                "name": "ExampleAttributeGroup2",
                "creationTime": "2023-02-28T21:57:30.687000+00:00",
                "lastUpdateTime": "2023-02-28T21:57:30.687000+00:00"
            }
        ]
    }

For more information, see `Viewing attribute group details <https://docs.aws.amazon.com/servicecatalog/latest/arguide/view-attr-group.html>`__ in the *AWS Service Catalog AppRegistry Administrator Guide*.