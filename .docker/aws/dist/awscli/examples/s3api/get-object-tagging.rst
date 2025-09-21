**To retrieve the tags attached to an object**

The following ``get-object-tagging`` example retrieves the values for the specified key from the specified object. ::

    aws s3api get-object-tagging \
        --bucket amzn-s3-demo-bucket \
        --key doc1.rtf

Output::

    {
        "TagSet": [
            {
                "Value": "confidential",
                "Key": "designation"
            }
        ]
    }

The following ``get-object-tagging`` example tries to retrieve the tag sets of the object ``doc2.rtf``, which has no tags. ::

    aws s3api get-object-tagging \
        --bucket amzn-s3-demo-bucket \
        --key doc2.rtf

Output::

    {
        "TagSet": []
    }


The following ``get-object-tagging`` example retrieves the tag sets of the object ``doc3.rtf``, which has multiple tags. ::

    aws s3api get-object-tagging \
        --bucket amzn-s3-demo-bucket \
        --key doc3.rtf

Output::

    {
        "TagSet": [
            {
                "Value": "confidential",
                "Key": "designation"
            },
            {
                "Value": "finance",
                "Key": "department"
            },
            {
                "Value": "payroll",
                "Key": "team"
            }
        ]
    }
