**To start an asynchronous targeted sentiment analysis job**

The following ``start-targeted-sentiment-detection-job`` example starts an asynchronous targeted sentiment analysis detection job for all files located at the address specified by the ``--input-data-config`` tag. 
The S3 bucket folder in this example contains ``SampleMovieReview1.txt``, ``SampleMovieReview2.txt``, and ``SampleMovieReview3.txt``. 
When the job is complete, ``output.tar.gz`` is placed at the location specified by the ``--output-data-config`` tag. ``output.tar.gz`` contains the files ``SampleMovieReview1.txt.out``, ``SampleMovieReview2.txt.out``, and ``SampleMovieReview3.txt.out``, which each contain all of the named entities and associated sentiments for a single input text file. ::

    aws comprehend start-targeted-sentiment-detection-job \
        --job-name targeted_movie_review_analysis1 \
        --language-code en \
        --input-data-config "S3Uri=s3://amzn-s3-demo-bucket/MovieData" \
        --output-data-config "S3Uri=s3://amzn-s3-demo-destination-bucket/testfolder/" \
        --data-access-role-arn arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role

Contents of ``SampleMovieReview1.txt``::

    "The film, AnyMovie, is fairly predictable and just okay."

Contents of ``SampleMovieReview2.txt``::

    "AnyMovie is the essential sci-fi film that I grew up watching when I was a kid. I highly recommend this movie."

Contents of ``SampleMovieReview3.txt``::

    "Don't get fooled by the 'awards' for AnyMovie. All parts of the film were poorly stolen from other modern directors."

Output:: 

    {
        "JobId": "0b5001e25f62ebb40631a9a1a7fde7b3",
        "JobArn": "arn:aws:comprehend:us-west-2:111122223333:targeted-sentiment-detection-job/0b5001e25f62ebb40631a9a1a7fde7b3",
        "JobStatus": "SUBMITTED"
    }

Contents of ``SampleMovieReview1.txt.out`` with line indents for readability::

    {
        "Entities": [
            {
            "DescriptiveMentionIndex": [
                0
            ],
            "Mentions": [
                {
                "BeginOffset": 4,
                "EndOffset": 8,
                "Score": 0.994972,
                "GroupScore": 1,
                "Text": "film",
                "Type": "MOVIE",
                "MentionSentiment": {
                    "Sentiment": "NEUTRAL",
                    "SentimentScore": {
                    "Mixed": 0,
                    "Negative": 0,
                    "Neutral": 1,
                    "Positive": 0
                    }
                }
                }
            ]
            },
            {
            "DescriptiveMentionIndex": [
                0
            ],
            "Mentions": [
                {
                "BeginOffset": 10,
                "EndOffset": 18,
                "Score": 0.631368,
                "GroupScore": 1,
                "Text": "AnyMovie",
                "Type": "ORGANIZATION",
                "MentionSentiment": {
                    "Sentiment": "POSITIVE",
                    "SentimentScore": {
                    "Mixed": 0.001729,
                    "Negative": 0.000001,
                    "Neutral": 0.000318,
                    "Positive": 0.997952
                    }
                }
                }
            ]
            }
        ],
        "File": "SampleMovieReview1.txt",
        "Line": 0
    }

Contents of ``SampleMovieReview2.txt.out`` line indents for readability::

    {
        "Entities": [
            {
            "DescriptiveMentionIndex": [
                0
            ],
            "Mentions": [
                {
                "BeginOffset": 0,
                "EndOffset": 8,
                "Score": 0.854024,
                "GroupScore": 1,
                "Text": "AnyMovie",
                "Type": "MOVIE",
                "MentionSentiment": {
                    "Sentiment": "POSITIVE",
                    "SentimentScore": {
                    "Mixed": 0,
                    "Negative": 0,
                    "Neutral": 0.000007,
                    "Positive": 0.999993
                    }
                }
                },
                {
                "BeginOffset": 104,
                "EndOffset": 109,
                "Score": 0.999129,
                "GroupScore": 0.502937,
                "Text": "movie",
                "Type": "MOVIE",
                "MentionSentiment": {
                    "Sentiment": "POSITIVE",
                    "SentimentScore": {
                    "Mixed": 0,
                    "Negative": 0,
                    "Neutral": 0,
                    "Positive": 1
                    }
                }
                },
                {
                "BeginOffset": 33,
                "EndOffset": 37,
                "Score": 0.999823,
                "GroupScore": 0.999252,
                "Text": "film",
                "Type": "MOVIE",
                "MentionSentiment": {
                    "Sentiment": "POSITIVE",
                    "SentimentScore": {
                    "Mixed": 0,
                    "Negative": 0,
                    "Neutral": 0.000001,
                    "Positive": 0.999999
                    }
                }
                }
            ]
            },
            {
            "DescriptiveMentionIndex": [
                0,
                1,
                2
            ],
            "Mentions": [
                {
                "BeginOffset": 43,
                "EndOffset": 44,
                "Score": 0.999997,
                "GroupScore": 1,
                "Text": "I",
                "Type": "PERSON",
                "MentionSentiment": {
                    "Sentiment": "NEUTRAL",
                    "SentimentScore": {
                    "Mixed": 0,
                    "Negative": 0,
                    "Neutral": 1,
                    "Positive": 0
                    }
                }
                },
                {
                "BeginOffset": 80,
                "EndOffset": 81,
                "Score": 0.999996,
                "GroupScore": 0.52523,
                "Text": "I",
                "Type": "PERSON",
                "MentionSentiment": {
                    "Sentiment": "NEUTRAL",
                    "SentimentScore": {
                    "Mixed": 0,
                    "Negative": 0,
                    "Neutral": 1,
                    "Positive": 0
                    }
                }
                },
                {
                "BeginOffset": 67,
                "EndOffset": 68,
                "Score": 0.999994,
                "GroupScore": 0.999499,
                "Text": "I",
                "Type": "PERSON",
                "MentionSentiment": {
                    "Sentiment": "NEUTRAL",
                    "SentimentScore": {
                    "Mixed": 0,
                    "Negative": 0,
                    "Neutral": 1,
                    "Positive": 0
                    }
                }
                }
            ]
            },
            {
            "DescriptiveMentionIndex": [
                0
            ],
            "Mentions": [
                {
                "BeginOffset": 75,
                "EndOffset": 78,
                "Score": 0.999978,
                "GroupScore": 1,
                "Text": "kid",
                "Type": "PERSON",
                "MentionSentiment": {
                    "Sentiment": "NEUTRAL",
                    "SentimentScore": {
                    "Mixed": 0,
                    "Negative": 0,
                    "Neutral": 1,
                    "Positive": 0
                    }
                }
                }
            ]
            }
        ],
        "File": "SampleMovieReview2.txt",
        "Line": 0
    }

Contents of ``SampleMovieReview3.txt.out`` with line indents for readibility::

    {
        "Entities": [
            {
            "DescriptiveMentionIndex": [
                1
            ],
            "Mentions": [
                {
                "BeginOffset": 64,
                "EndOffset": 68,
                "Score": 0.992953,
                "GroupScore": 0.999814,
                "Text": "film",
                "Type": "MOVIE",
                "MentionSentiment": {
                    "Sentiment": "NEUTRAL",
                    "SentimentScore": {
                    "Mixed": 0.000004,
                    "Negative": 0.010425,
                    "Neutral": 0.989543,
                    "Positive": 0.000027
                    }
                }
                },
                {
                "BeginOffset": 37,
                "EndOffset": 45,
                "Score": 0.999782,
                "GroupScore": 1,
                "Text": "AnyMovie",
                "Type": "ORGANIZATION",
                "MentionSentiment": {
                    "Sentiment": "POSITIVE",
                    "SentimentScore": {
                    "Mixed": 0.000095,
                    "Negative": 0.039847,
                    "Neutral": 0.000673,
                    "Positive": 0.959384
                    }
                }
                }
            ]
            },
            {
            "DescriptiveMentionIndex": [
                0
            ],
            "Mentions": [
                {
                "BeginOffset": 47,
                "EndOffset": 50,
                "Score": 0.999991,
                "GroupScore": 1,
                "Text": "All",
                "Type": "QUANTITY",
                "MentionSentiment": {
                    "Sentiment": "NEUTRAL",
                    "SentimentScore": {
                    "Mixed": 0.000001,
                    "Negative": 0.000001,
                    "Neutral": 0.999998,
                    "Positive": 0
                    }
                }
                }
            ]
            },
            {
            "DescriptiveMentionIndex": [
                0
            ],
            "Mentions": [
                {
                "BeginOffset": 106,
                "EndOffset": 115,
                "Score": 0.542083,
                "GroupScore": 1,
                "Text": "directors",
                "Type": "PERSON",
                "MentionSentiment": {
                    "Sentiment": "NEUTRAL",
                    "SentimentScore": {
                    "Mixed": 0,
                    "Negative": 0,
                    "Neutral": 1,
                    "Positive": 0
                    }
                }
                }
            ]
            }
        ],
        "File": "SampleMovieReview3.txt",
        "Line": 0
    }

For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.