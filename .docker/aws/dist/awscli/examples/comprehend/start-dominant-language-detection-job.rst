**To start an asynchronous language detection job**

The following ``start-dominant-language-detection-job`` example starts an asynchronous language detection job for all of the files located at the address specified by 
the ``--input-data-config`` tag. The S3 bucket in this example contains ``Sampletext1.txt``. 
When the job is complete, the folder, ``output``, is placed in the location specified by the ``--output-data-config`` tag. The folder contains ``output.txt`` 
which contains the dominant language of each of the text files as well as the pre-trained model's confidence score for each prediction. ::

    aws comprehend start-dominant-language-detection-job \
        --job-name example_language_analysis_job \
        --language-code en \
        --input-data-config "S3Uri=s3://amzn-s3-demo-bucket/" \
        --output-data-config "S3Uri=s3://amzn-s3-demo-destination-bucket/testfolder/" \
        --data-access-role-arn arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role \
        --language-code en

Contents of Sampletext1.txt::

    "Physics is the natural science that involves the study of matter and its motion and behavior through space and time, along with related concepts such as energy and force."

Output::

    {
        "JobId": "123456abcdeb0e11022f22a11EXAMPLE",
        "JobArn": "arn:aws:comprehend:us-west-2:111122223333:dominant-language-detection-job/123456abcdeb0e11022f22a11EXAMPLE",
        "JobStatus": "SUBMITTED"
    }

Contents of ``output.txt``::

    {"File": "Sampletext1.txt", "Languages": [{"LanguageCode": "en", "Score": 0.9913753867149353}], "Line": 0}

For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.