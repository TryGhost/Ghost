**To retrieve the list of tags for a Lambda function**

The following ``list-tags`` example displays the tags attached to the ``my-function`` Lambda function. ::

    aws lambda list-tags \
        --resource arn:aws:lambda:us-west-2:123456789012:function:my-function

Output::

    {
        "Tags": {
            "Category": "Web Tools",
            "Department": "Sales"
        }
    }

For more information, see `Tagging Lambda Functions <https://docs.aws.amazon.com/lambda/latest/dg/tagging.html>`__ in the *AWS Lambda Developer Guide*.
