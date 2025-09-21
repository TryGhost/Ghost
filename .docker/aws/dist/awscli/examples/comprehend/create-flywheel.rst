**To create a flywheel**

The following ``create-flywheel`` example creates a flywheel to orchestrate the ongoing training of either a document classification or entity
recognition model. The flywheel in this example is created to manage an existing trained model specified by the ``--active-model-arn`` tag.
When the flywheel is created, a data lake is created at the ``--input-data-lake`` tag. ::

    aws comprehend create-flywheel \
        --flywheel-name example-flywheel \
        --active-model-arn arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-model/version/1 \
        --data-access-role-arn arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role \
        --data-lake-s3-uri "s3://amzn-s3-demo-bucket"

Output::

    {
        "FlywheelArn": "arn:aws:comprehend:us-west-2:111122223333:flywheel/example-flywheel"
    }

For more information, see `Flywheel Overview <https://docs.aws.amazon.com/comprehend/latest/dg/flywheels-about.html>`__ in *Amazon Comprehend Developer Guide*.