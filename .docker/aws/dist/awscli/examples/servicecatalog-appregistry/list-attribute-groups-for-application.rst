**To list attribute groups for an application**

The following ``list-attribute-groups-for-application`` example lists the details of all attribute groups in your AWS account that are associated with a specific application in your AWS account. ::

    aws servicecatalog-appregistry list-attribute-groups-for-application \
        --application "ExampleApplication"

Output::

    {
        "attributeGroupsDetails": [
            {
                "id": "01sj5xdwhbw54kejwnt09fnpcl",
                "arn": "arn:aws:servicecatalog:us-west-2:813737243517:/attribute-groups/01sj5xdwhbw54kejwnt09fnpcl",
                "name": "ExampleAttributeGroup"
            }
        ]
    }

For more information, see `Viewing attribute group details <https://servicecatalog/latest/arguide/view-attr-group.html>`__ in the *AWS Service Catalog AppRegistry Administrator Guide*.