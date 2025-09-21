**To list tags for resource**

The following ``list-tags-for-resource`` example lists the tags for an Amazon Comprehend resource. ::

    aws comprehend list-tags-for-resource \
        --resource-arn arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-classifier/version/1

Output::

    {
        "ResourceArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-classifier/version/1",
        "Tags": [
            {
                "Key": "Department",
                "Value": "Finance"
            },
            {
                "Key": "location",
                "Value": "Seattle"
            }
        ]
    }

For more information, see `Tagging your resources <https://docs.aws.amazon.com/comprehend/latest/dg/tagging.html>`__ in the *Amazon Comprehend Developer Guide*.