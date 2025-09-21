**To update a TagOption**

The following ``update-tag-option`` example updates the value of a ``TagOption``, using the specified JSON file. ::

    aws servicecatalog update-tag-option --cli-input-json file://update-tag-option-input.json

Contents of ``update-tag-option-input.json``::

    {
        "Id": "tag-iabcdn4fzjjms",
        "Value": "newvalue",
        "Active": true
    }

Output::

    {
        "TagOptionDetail": {
            "Value": "newvalue",
            "Key": "1234",
            "Active": true,
            "Id": "tag-iabcdn4fzjjms"
        }
    }
