**To start detecting text in a multi-page document**

The following ``start-document-text-detection`` example shows how to start asynchronous detection of text in a multi-page document. 

Linux/macOS::

    aws textract start-document-text-detection \
            --document-location '{"S3Object":{"Bucket":"bucket","Name":"document"}}' \
            --notification-channel "SNSTopicArn=arn:snsTopic,RoleArn=roleARN"

Windows::

    aws textract start-document-text-detection \
        --document-location "{\"S3Object\":{\"Bucket\":\"bucket\",\"Name\":\"document\"}}" \
        --region region-name \
        --notification-channel "SNSTopicArn=arn:snsTopic,RoleArn=roleArn"

Output::

    {
        "JobId": "57849a3dc627d4df74123dca269d69f7b89329c870c65bb16c9fd63409d200b9"
    }

For more information, see `Detecting and Analyzing Text in Multi-Page Documents`_ in the *Amazon Textract Developers Guide*

.. _`Detecting and Analyzing Text in Multi-Page Documents`: https://docs.aws.amazon.com/textract/latest/dg/async.html