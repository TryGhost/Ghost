**To start a flywheel iteration**

The following ``start-flywheel-iteration`` example starts a flywheel iteration. This operation uses any new datasets in the flywheel to train a new model version. ::

    aws comprehend start-flywheel-iteration \
        --flywheel-arn arn:aws:comprehend:us-west-2:111122223333:flywheel/example-flywheel

Output::

    {
        "FlywheelArn": "arn:aws:comprehend:us-west-2:111122223333:flywheel/example-flywheel",
        "FlywheelIterationId": "12345123TEXAMPLE"
    }

For more information, see `Flywheel overview <https://docs.aws.amazon.com/comprehend/latest/dg/flywheels-about.html>`__ in the *Amazon Comprehend Developer Guide*. 