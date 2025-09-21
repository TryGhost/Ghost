**To stop the training of a document classifier model**

The following ``stop-training-document-classifier`` example stops the training of a document classifier model while in-progress. ::

    aws comprehend stop-training-document-classifier
        --document-classifier-arn arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-classifier

This command produces no output.

For more information, see `Creating and managing custom models <https://docs.aws.amazon.com/comprehend/latest/dg/manage-models.html>`__ in the *Amazon Comprehend Developer Guide*.