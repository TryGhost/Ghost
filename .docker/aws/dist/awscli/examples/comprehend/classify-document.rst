**To classify document with model-specific endpoint**

The following ``classify-document`` example classifies a document with an endpoint of a custom model. The model in this example was trained on
a dataset containing sms messages labeled as spam or non-spam, or, "ham". ::

    aws comprehend classify-document \
        --endpoint-arn arn:aws:comprehend:us-west-2:111122223333:document-classifier-endpoint/example-classifier-endpoint \
        --text "CONGRATULATIONS! TXT 1235550100 to win $5000"

Output::

    {
        "Classes": [
            {
                "Name": "spam",
                "Score": 0.9998599290847778
            },
            {
                "Name": "ham",
                "Score": 0.00014001205272506922
            }
        ]
    }

For more information, see `Custom Classification <https://docs.aws.amazon.com/comprehend/latest/dg/how-document-classification.html>`__ in the *Amazon Comprehend Developer Guide*.
