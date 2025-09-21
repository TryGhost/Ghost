**To import a model**

The following ``import-model`` example imports a model from a different AWS account. The document classifier model in account ``444455556666`` 
has a resource-based policy allowing account ``111122223333`` to import the model. ::

    aws comprehend import-model \
        --source-model-arn arn:aws:comprehend:us-west-2:444455556666:document-classifier/example-classifier

Output::

    {
        "ModelArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-classifier"
    }

For more information, see `Copying custom models between AWS accounts <https://docs.aws.amazon.com/comprehend/latest/dg/custom-copy.html>`__ in the *Amazon Comprehend Developer Guide*.