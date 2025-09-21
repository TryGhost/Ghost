**To create a custom entity recognizer**

The following ``create-entity-recognizer`` example begins the training process for a custom entity recognizer model. This example uses a CSV file containing training documents, ``raw_text.csv``, and a CSV entity list, ``entity_list.csv`` to train the model. 
``entity-list.csv`` contains the following columns: text and type. ::

    aws comprehend create-entity-recognizer \
        --recognizer-name example-entity-recognizer
        --data-access-role-arn arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role \
        --input-data-config "EntityTypes=[{Type=DEVICE}],Documents={S3Uri=s3://amzn-s3-demo-bucket/trainingdata/raw_text.csv},EntityList={S3Uri=s3://amzn-s3-demo-bucket/trainingdata/entity_list.csv}"
        --language-code en

Output::

    {
        "EntityRecognizerArn": "arn:aws:comprehend:us-west-2:111122223333:example-entity-recognizer/entityrecognizer1"
    }

For more information, see `Custom entity recognition <https://docs.aws.amazon.com/comprehend/latest/dg/custom-entity-recognition.html>`__ in the *Amazon Comprehend Developer Guide*.