**To describe a flywheel dataset**

The following ``describe-dataset`` example gets the properties of a flywheel dataset. ::

    aws comprehend describe-dataset \
        --dataset-arn arn:aws:comprehend:us-west-2:111122223333:flywheel/flywheel-entity/dataset/example-dataset

Output::

    {
        "DatasetProperties": {
            "DatasetArn": "arn:aws:comprehend:us-west-2:111122223333:flywheel/flywheel-entity/dataset/example-dataset",
            "DatasetName": "example-dataset",
            "DatasetType": "TRAIN",
            "DatasetS3Uri": "s3://amzn-s3-demo-bucket/flywheel-entity/schemaVersion=1/12345678A123456Z/datasets/example-dataset/20230616T203710Z/",
            "Status": "CREATING",
            "CreationTime": "2023-06-16T20:37:10.400000+00:00"
        }
    }

For more information, see `Flywheel Overview <https://docs.aws.amazon.com/comprehend/latest/dg/flywheels-about.html>`__ in *Amazon Comprehend Developer Guide*.