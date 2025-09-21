**To create a TagOption**

The following ``create-tag-option`` example creates a TagOption. ::

    aws servicecatalog create-tag-option 
        --key 1234
        --value name

Output::

    {
        "TagOptionDetail": {
        "Id": "tag-iabcdn4fzjjms",
        "Value": "name",
        "Active": true,
        "Key": "1234"
        }
    }

