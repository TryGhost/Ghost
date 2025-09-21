**To remove AWS tags from a connections resource**

The following ``untag-resource`` removes a tag from the specified resource. ::

    aws codestar-connections untag-resource \
        --resource-arn arn:aws:codestar-connections:us-east-1:123456789012:connection/aEXAMPLE-8aad-4d5d-8878-dfcab0bc441f \
        --tag-keys Project ReadOnly

Output::

    {
        "Tags": []
    }

For more information, see `Remove tags from a connections resource <https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-tag.html#connections-tag-delete>`__ in the *Developer Tools console User Guide*.