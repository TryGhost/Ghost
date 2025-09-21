**To start an asynchronous sentiment analysis job**

The following ``start-sentiment-detection-job`` example starts an asynchronous sentiment analysis detection job for all files located at the address specified by the ``--input-data-config`` tag.
The S3 bucket folder in this example contains ``SampleMovieReview1.txt``, ``SampleMovieReview2.txt``, and ``SampleMovieReview3.txt``. When the job is complete, 
the folder, ``output``, is placed at the location specified by the ``--output-data-config`` tag. The folder contains the file, ``output.txt``, which contains the prevailing sentiments for each text file and the pre-trained model's confidence score for each prediction.
The Json output is printed on one line per file, but is formatted here for readability. ::

    aws comprehend start-sentiment-detection-job \
        --job-name example-sentiment-detection-job \
        --language-code en \
        --input-data-config "S3Uri=s3://amzn-s3-demo-bucket/MovieData" \
        --output-data-config "S3Uri=s3://amzn-s3-demo-destination-bucket/testfolder/" \
        --data-access-role-arn arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role

Contents of ``SampleMovieReview1.txt``::

    "The film, AnyMovie2, is fairly predictable and just okay."

Contents of ``SampleMovieReview2.txt``::

    "AnyMovie2 is the essential sci-fi film that I grew up watching when I was a kid. I highly recommend this movie."

Contents of ``SampleMovieReview3.txt``::

    "Don't get fooled by the 'awards' for AnyMovie2. All parts of the film were poorly stolen from other modern directors."

Output:: 

    {
        "JobId": "0b5001e25f62ebb40631a9a1a7fde7b3",
        "JobArn": "arn:aws:comprehend:us-west-2:111122223333:sentiment-detection-job/0b5001e25f62ebb40631a9a1a7fde7b3",
        "JobStatus": "SUBMITTED"
    }

Contents of ``output.txt`` with line of indents for readability::

    {
        "File": "SampleMovieReview1.txt",
            "Line": 0,
            "Sentiment": "MIXED",
            "SentimentScore": {
                "Mixed": 0.6591159105300903,
                "Negative": 0.26492202281951904,
                "Neutral": 0.035430654883384705,
                "Positive": 0.04053137078881264
                }
            }
        {
        "File": "SampleMovieReview2.txt",
            "Line": 0,
            "Sentiment": "POSITIVE",
            "SentimentScore": {
                "Mixed": 0.000008718466233403888,
                "Negative": 0.00006134175055194646,
                "Neutral": 0.0002941041602753103,
                "Positive": 0.9996358156204224
                }
            }
        {
        "File": "SampleMovieReview3.txt",
            "Line": 0,
            "Sentiment": "NEGATIVE",
            "SentimentScore": {
                "Mixed": 0.004146667663007975,
                "Negative": 0.9645107984542847,
                "Neutral": 0.016559595242142677,
                "Positive": 0.014782938174903393
            }
        }
    }

For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.