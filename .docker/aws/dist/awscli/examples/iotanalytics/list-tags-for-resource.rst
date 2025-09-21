**To list tags for a resource**

The following ``list-tags-for-resource`` example Lists the tags that you have attached to the specified resource. ::

    aws iotanalytics list-tags-for-resource \
        --resource-arn "arn:aws:iotanalytics:us-west-2:123456789012:channel/mychannel"

Output::

    {
        "tags": [
            {
                "value": "bar",
                "key": "foo"
            }
        ]
    }

For more information, see `ListTagsForResource <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_ListTagsForResource.html>`__ in the *AWS IoT Analytics API Reference*.
