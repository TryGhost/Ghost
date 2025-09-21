**To delete a flywheel**

The following ``delete-flywheel`` example deletes a flywheel. The data lake or the model associated with the flywheel is not deleted. ::

    aws comprehend delete-flywheel \
        --flywheel-arn arn:aws:comprehend:us-west-2:111122223333:flywheel/example-flywheel-1

This command produces no output.

For more information, see `Flywheel overview <https://docs.aws.amazon.com/comprehend/latest/dg/flywheels-about.html>`__ in the *Amazon Comprehend Developer Guide*. 