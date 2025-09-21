**To associate an attribute group**

The following ``associate-attribute-group`` example associates a specific attribute group in your AWS account to a specific application in your AWS account. ::

    aws servicecatalog-appregistry associate-attribute-group \
        --application "ExampleApplication" \
        --attribute-group "ExampleAttributeGroup"

Output::

    {
        "applicationArn": "arn:aws:servicecatalog:us-west-2:813737243517:/applications/0ars38r6btoohvpvd9gqrptt9l",
        "attributeGroupArn": "arn:aws:servicecatalog:us-west-2:813737243517:/attribute-groups/01sj5xdwhbw54kejwnt09fnpcl"
    }

For more information, see `Associating and disassociating attribute groups <https://docs.aws.amazon.com/servicecatalog/latest/arguide/associate-attr-groups.html>`__ in the *AWS Service Catalog AppRegistry Administrator Guide*.