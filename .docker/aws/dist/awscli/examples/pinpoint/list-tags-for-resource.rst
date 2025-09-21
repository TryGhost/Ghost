**To retrieve a list of tags for a resource**

The following ``list-tags-for-resource`` example retrieves all the tags (key names and values) that are associated with the specified resource. ::

    aws pinpoint list-tags-for-resource \
        --resource-arn arn:aws:mobiletargeting:us-west-2:AIDACKCEVSQ6C2EXAMPLE:apps/810c7aab86d42fb2b56c8c966example

Output::

    {
        "TagsModel": {
            "tags": {
                "Year": "2019",
                "Stack": "Production"
            }
        }
    }

For more information, see 'Tagging Amazon Pinpoint Resources <https://docs.aws.amazon.com/pinpoint/latest/developerguide/tagging-resources.html>'__ in the *Amazon Pinpoint Developer Guide*.