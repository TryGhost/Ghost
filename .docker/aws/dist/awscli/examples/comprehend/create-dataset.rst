**To create a flywheel dataset**

The following ``create-dataset`` example creates a dataset for a flywheel. This dataset will be used as additional training data as specified by the
``--dataset-type`` tag. ::

    aws comprehend create-dataset \
        --flywheel-arn arn:aws:comprehend:us-west-2:111122223333:flywheel/flywheel-entity \
        --dataset-name example-dataset \
        --dataset-type "TRAIN" \
        --input-data-config file://inputConfig.json

Contents of ``file://inputConfig.json``::

    {
        "DataFormat": "COMPREHEND_CSV",
        "DocumentClassifierInputDataConfig": {
            "S3Uri": "s3://amzn-s3-demo-bucket/training-data.csv"
        }
    }  

Output::

    {
        "DatasetArn": "arn:aws:comprehend:us-west-2:111122223333:flywheel/flywheel-entity/dataset/example-dataset"
    }

For more information, see `Flywheel Overview <https://docs.aws.amazon.com/comprehend/latest/dg/flywheels-about.html>`__ in *Amazon Comprehend Developer Guide*.