**To describe a TagOption**

The following ``describe-tag-option`` example displays details for the specified TagOption. ::

    aws servicecatalog describe-tag-option \
        --id tag-p3tej2abcd5qc

Output::

    {
        "TagOptionDetail": {
            "Active": true,
            "Id": "tag-p3tej2abcd5qc",
            "Value": "value-3",
            "Key": "1234"
        }
    }
