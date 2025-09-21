**To attach a resource-based policy**

The following ``put-resource-policy`` example attaches a resource-based policy to a model so that can be imported by another AWS account.
The policy is attached to the model in account ``111122223333`` and allows account ``444455556666`` import the model. ::

    aws comprehend put-resource-policy \
        --resource-arn arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-classifier/version/1 \
        --resource-policy '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"comprehend:ImportModel","Resource":"*","Principal":{"AWS":["arn:aws:iam::444455556666:root"]}}]}'

Ouput::

    {
        "PolicyRevisionId": "aaa111d069d07afaa2aa3106aEXAMPLE"
    }

For more information, see `Copying custom models between AWS accounts <https://docs.aws.amazon.com/comprehend/latest/dg/custom-copy.html>`__ in the *Amazon Comprehend Developer Guide*.