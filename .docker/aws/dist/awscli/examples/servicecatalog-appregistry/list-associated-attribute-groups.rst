**To list associated attribute groups**

The following ``list-associated-attribute-groups`` example retrieves a list of all attribute groups in your AWS account that are associated with a specific application in your AWS account. ::

    aws servicecatalog-appregistry list-associated-attribute-groups \
        --application "ExampleApplication"

Output::

    {
        "attributeGroups": [
            "01sj5xdwhbw54kejwnt09fnpcl"
        ]
    }

For more information, see `Associating and disassociating attribute groups <https://https://docs.aws.amazon.com/servicecatalog/latest/arguide/associate-attr-groups.html>`__ in the *AWS Service Catalog AppRegistry Administrator Guide*.