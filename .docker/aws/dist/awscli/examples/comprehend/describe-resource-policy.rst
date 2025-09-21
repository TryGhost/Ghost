**To describe a resource policy attached to a model**

The following ``describe-resource-policy`` example gets the properties of a resource-based policy attached to a model. ::

    aws comprehend describe-resource-policy \
        --resource-arn arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-classifier/version/1

Output::

    {
        "ResourcePolicy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"arn:aws:iam::444455556666:root\"},\"Action\":\"comprehend:ImportModel\",\"Resource\":\"*\"}]}",
        "CreationTime": "2023-06-19T18:44:26.028000+00:00",
        "LastModifiedTime": "2023-06-19T18:53:02.002000+00:00",
        "PolicyRevisionId": "baa675d069d07afaa2aa3106ae280f61"
    }

For more information, see `Copying custom models between AWS accounts <https://docs.aws.amazon.com/comprehend/latest/dg/custom-copy.html>`__ in the *Amazon Comprehend Developer Guide*.