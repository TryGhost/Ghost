**To start a topics detection analysis job**

The following ``start-topics-detection-job`` example starts an asynchronous topics detection job for all files located at the address specified by the ``--input-data-config`` tag. 
When the job is complete, the folder, ``output``, is placed at the location specified by the ``--ouput-data-config`` tag.
``output`` contains `topic-terms.csv` and `doc-topics.csv`. The first output file, `topic-terms.csv`, is a list of topics in the collection. For each topic, the list includes, by default, the top terms by topic according to their weight.
The second file, ``doc-topics.csv``, lists the documents associated with a topic and the proportion of the document that is concerned with the topic. ::

    aws comprehend start-topics-detection-job \
        --job-name example_topics_detection_job \
        --language-code en \
        --input-data-config "S3Uri=s3://amzn-s3-demo-bucket/" \
        --output-data-config "S3Uri=s3://amzn-s3-demo-destination-bucket/testfolder/" \
        --data-access-role-arn arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role \
        --language-code en

Output::

    {
        "JobId": "123456abcdeb0e11022f22a11EXAMPLE",
        "JobArn": "arn:aws:comprehend:us-west-2:111122223333:key-phrases-detection-job/123456abcdeb0e11022f22a11EXAMPLE",
        "JobStatus": "SUBMITTED"
    }

For more information, see `Topic Modeling <https://docs.aws.amazon.com/comprehend/latest/dg/topic-modeling.html>`__ in the *Amazon Comprehend Developer Guide*.