**To stop the training of an entity recognizer model**

The following ``stop-training-entity-recognizer`` example stops the training of an entity recognizer model while in-progress. ::

    aws comprehend stop-training-entity-recognizer
        --entity-recognizer-arn "arn:aws:comprehend:us-west-2:111122223333:entity-recognizer/examplerecognizer1"

This command produces no output.

For more information, see `Creating and managing custom models <https://docs.aws.amazon.com/comprehend/latest/dg/manage-models.html>`__ in the *Amazon Comprehend Developer Guide*.