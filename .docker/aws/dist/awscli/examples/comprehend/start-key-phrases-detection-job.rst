**To start a key phrases detection job**

The following ``start-key-phrases-detection-job`` example starts an asynchronous key phrases detection job for all files located at the address specified by
the ``--input-data-config`` tag. The S3 bucket in this example contains ``Sampletext1.txt``, ``Sampletext2.txt``, and ``Sampletext3.txt``. 
When the job is completed, the folder, ``output``, is placed in the location specified by the ``--output-data-config`` tag. The folder contains 
the file ``output.txt`` which contains all the key phrases detected within each text file and the pre-trained model's confidence score for each prediction. 
The Json output is printed on one line per file, but is formatted here for readability. ::

    aws comprehend start-key-phrases-detection-job \
        --job-name keyphrasesanalysistest1 \
        --language-code en \
        --input-data-config "S3Uri=s3://amzn-s3-demo-bucket/" \
        --output-data-config "S3Uri=s3://amzn-s3-demo-destination-bucket/testfolder/" \
        --data-access-role-arn "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role" \
        --language-code en

Contents of ``Sampletext1.txt``::

    "Hello Zhang Wei, I am John. Your AnyCompany Financial Services, LLC credit card account 1111-XXXX-1111-XXXX has a minimum payment of $24.53 that is due by July 31st."

Contents of ``Sampletext2.txt``::

    "Dear Max, based on your autopay settings for your account Internet.org account, we will withdraw your payment on the due date from your bank account number XXXXXX1111 with the routing number XXXXX0000. "

Contents of ``Sampletext3.txt``:: 

    "Jane, please submit any customer feedback from this weekend to Sunshine Spa, 123 Main St, Anywhere and send comments to Alice at AnySpa@example.com."
    
Output::

    {
        "JobId": "123456abcdeb0e11022f22a11EXAMPLE",
        "JobArn": "arn:aws:comprehend:us-west-2:111122223333:key-phrases-detection-job/123456abcdeb0e11022f22a11EXAMPLE",
        "JobStatus": "SUBMITTED"
    }

Contents of ``output.txt`` with line indents for readibility::

    {
        "File": "SampleText1.txt",
        "KeyPhrases": [
            {
            "BeginOffset": 6,
            "EndOffset": 15,
            "Score": 0.9748965572679326,
            "Text": "Zhang Wei"
            },
            {
            "BeginOffset": 22,
            "EndOffset": 26,
            "Score": 0.9997344722354619,
            "Text": "John"
            },
            {
            "BeginOffset": 28,
            "EndOffset": 62,
            "Score": 0.9843791074032948,
            "Text": "Your AnyCompany Financial Services"
            },
            {
            "BeginOffset": 64,
            "EndOffset": 107,
            "Score": 0.8976122401721824,
            "Text": "LLC credit card account 1111-XXXX-1111-XXXX"
            },
            {
            "BeginOffset": 112,
            "EndOffset": 129,
            "Score": 0.9999612982629748,
            "Text": "a minimum payment"
            },
            {
            "BeginOffset": 133,
            "EndOffset": 139,
            "Score": 0.99975728947036,
            "Text": "$24.53"
            },
            {
            "BeginOffset": 155,
            "EndOffset": 164,
            "Score": 0.9940866241449973,
            "Text": "July 31st"
            }
        ],
        "Line": 0
        }
        {
        "File": "SampleText2.txt",
        "KeyPhrases": [
            {
            "BeginOffset": 0,
            "EndOffset": 8,
            "Score": 0.9974021100118472,
            "Text": "Dear Max"
            },
            {
            "BeginOffset": 19,
            "EndOffset": 40,
            "Score": 0.9961120519515884,
            "Text": "your autopay settings"
            },
            {
            "BeginOffset": 45,
            "EndOffset": 78,
            "Score": 0.9980620070116009,
            "Text": "your account Internet.org account"
            },
            {
            "BeginOffset": 97,
            "EndOffset": 109,
            "Score": 0.999919660140754,
            "Text": "your payment"
            },
            {
            "BeginOffset": 113,
            "EndOffset": 125,
            "Score": 0.9998370719754205,
            "Text": "the due date"
            },
            {
            "BeginOffset": 131,
            "EndOffset": 166,
            "Score": 0.9955068678502509,
            "Text": "your bank account number XXXXXX1111"
            },
            {
            "BeginOffset": 172,
            "EndOffset": 200,
            "Score": 0.8653433315829526,
            "Text": "the routing number XXXXX0000"
            }
        ],
        "Line": 0
        }
        {
        "File": "SampleText3.txt",
        "KeyPhrases": [
            {
            "BeginOffset": 0,
            "EndOffset": 4,
            "Score": 0.9142947833681668,
            "Text": "Jane"
            },
            {
            "BeginOffset": 20,
            "EndOffset": 41,
            "Score": 0.9984325676596763,
            "Text": "any customer feedback"
            },
            {
            "BeginOffset": 47,
            "EndOffset": 59,
            "Score": 0.9998782448150636,
            "Text": "this weekend"
            },
            {
            "BeginOffset": 63,
            "EndOffset": 75,
            "Score": 0.99866741830757,
            "Text": "Sunshine Spa"
            },
            {
            "BeginOffset": 77,
            "EndOffset": 88,
            "Score": 0.9695803485466054,
            "Text": "123 Main St"
            },
            {
            "BeginOffset": 108,
            "EndOffset": 116,
            "Score": 0.9997065928550928,
            "Text": "comments"
            },
            {
            "BeginOffset": 120,
            "EndOffset": 125,
            "Score": 0.9993466833825161,
            "Text": "Alice"
            },
            {
            "BeginOffset": 129,
            "EndOffset": 144,
            "Score": 0.9654563612885667,
            "Text": "AnySpa@example.com"
            }
        ],
        "Line": 0
    }

For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.