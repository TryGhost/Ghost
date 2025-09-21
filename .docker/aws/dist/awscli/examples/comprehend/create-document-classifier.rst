**To create a document classifier to categorize documents**

The following ``create-document-classifier`` example begins the training process for a document classifier model. The training data file, ``training.csv``, is located at the ``--input-data-config`` tag. ``training.csv`` is a two column document where the labels, or, classifications are provided in the first column and the documents are provided in the second column. ::

    aws comprehend create-document-classifier \
        --document-classifier-name example-classifier \
        --data-access-arn arn:aws:comprehend:us-west-2:111122223333:pii-entities-detection-job/123456abcdeb0e11022f22a11EXAMPLE \
        --input-data-config "S3Uri=s3://amzn-s3-demo-bucket/" \
        --language-code en
    
Output:: 

    {
        "DocumentClassifierArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-classifier"
    }

For more information, see `Custom Classification <https://docs.aws.amazon.com/comprehend/latest/dg/how-document-classification.html>`__ in the *Amazon Comprehend Developer Guide*.
