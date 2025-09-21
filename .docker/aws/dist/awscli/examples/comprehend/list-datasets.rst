**To list all flywheel datasets**

The following ``list-datasets`` example lists all datasets associated with a flywheel. ::

    aws comprehend list-datasets \
        --flywheel-arn arn:aws:comprehend:us-west-2:111122223333:flywheel/flywheel-entity

Output:: 

    {
        "DatasetPropertiesList": [
            {
                "DatasetArn": "arn:aws:comprehend:us-west-2:111122223333:flywheel/flywheel-entity/dataset/example-dataset-1",
                "DatasetName": "example-dataset-1",
                "DatasetType": "TRAIN",
                "DatasetS3Uri": "s3://amzn-s3-demo-bucket/flywheel-entity/schemaVersion=1/20230616T200543Z/datasets/example-dataset-1/20230616T203710Z/",
                "Status": "CREATING",
                "CreationTime": "2023-06-16T20:37:10.400000+00:00"
            },
            {
                "DatasetArn": "arn:aws:comprehend:us-west-2:111122223333:flywheel/flywheel-entity/dataset/example-dataset-2",
                "DatasetName": "example-dataset-2",
                "DatasetType": "TRAIN",
                "DatasetS3Uri": "s3://amzn-s3-demo-bucket/flywheel-entity/schemaVersion=1/20230616T200543Z/datasets/example-dataset-2/20230616T200607Z/",
                "Description": "TRAIN Dataset created by Flywheel creation.",
                "Status": "COMPLETED",
                "NumberOfDocuments": 5572,
                "CreationTime": "2023-06-16T20:06:07.722000+00:00"
            }
        ]
    }

For more information, see `Flywheel Overview <https://docs.aws.amazon.com/comprehend/latest/dg/flywheels-about.html>`__ in *Amazon Comprehend Developer Guide*.