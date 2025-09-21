**To start an asynchronous PII detection job**

The following ``start-pii-entities-detection-job`` example starts an asynchronous personal identifiable information (PII) entities detection job for all files located at the address specified by
the ``--input-data-config`` tag. The S3 bucket in this example contains ``Sampletext1.txt``, ``Sampletext2.txt``, and ``Sampletext3.txt``. 
When the job is complete, the folder, ``output``, is placed in the location specified by the ``--output-data-config`` tag. The folder contains 
``SampleText1.txt.out``, ``SampleText2.txt.out``, and ``SampleText3.txt.out`` which list the named entities within each text file. The Json output is printed on one line per file, but is formatted here for readability. ::

    aws comprehend start-pii-entities-detection-job \
        --job-name entities_test \
        --language-code en \
        --input-data-config "S3Uri=s3://amzn-s3-demo-bucket/" \
        --output-data-config "S3Uri=s3://amzn-s3-demo-destination-bucket/testfolder/" \
        --data-access-role-arn arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role \
        --language-code en \
        --mode ONLY_OFFSETS

Contents of ``Sampletext1.txt``::

    "Hello Zhang Wei, I am John. Your AnyCompany Financial Services, LLC credit card account 1111-XXXX-1111-XXXX has a minimum payment of $24.53 that is due by July 31st."

Contents of ``Sampletext2.txt``::

    "Dear Max, based on your autopay settings for your account Internet.org account, we will withdraw your payment on the due date from your bank account number XXXXXX1111 with the routing number XXXXX0000. "

Contents of ``Sampletext3.txt``:: 

    "Jane, please submit any customer feedback from this weekend to Sunshine Spa, 123 Main St, Anywhere and send comments to Alice at AnySpa@example.com."

Output::

    {
        "JobId": "123456abcdeb0e11022f22a11EXAMPLE",
        "JobArn": "arn:aws:comprehend:us-west-2:111122223333:pii-entities-detection-job/123456abcdeb0e11022f22a11EXAMPLE",
        "JobStatus": "SUBMITTED"
    }

Contents of ``SampleText1.txt.out`` with line indents for readability::

    {
        "Entities": [
            {
            "BeginOffset": 6,
            "EndOffset": 15,
            "Type": "NAME",
            "Score": 0.9998490510222595
            },
            {
            "BeginOffset": 22,
            "EndOffset": 26,
            "Type": "NAME",
            "Score": 0.9998937958019426
            },
            {
            "BeginOffset": 88,
            "EndOffset": 107,
            "Type": "CREDIT_DEBIT_NUMBER",
            "Score": 0.9554297245278491
            },
            {
            "BeginOffset": 155,
            "EndOffset": 164,
            "Type": "DATE_TIME",
            "Score": 0.9999720462925257
            }
        ],
        "File": "SampleText1.txt",
        "Line": 0
    }

Contents of ``SampleText2.txt.out`` with line indents for readability::

    {
        "Entities": [
            {
            "BeginOffset": 5,
            "EndOffset": 8,
            "Type": "NAME",
            "Score": 0.9994390774924007
            },
            {
            "BeginOffset": 58,
            "EndOffset": 70,
            "Type": "URL",
            "Score": 0.9999958276922101
            },
            {
            "BeginOffset": 156,
            "EndOffset": 166,
            "Type": "BANK_ACCOUNT_NUMBER",
            "Score": 0.9999721058045592
            },
            {
            "BeginOffset": 191,
            "EndOffset": 200,
            "Type": "BANK_ROUTING",
            "Score": 0.9998968945989909
            }
        ],
        "File": "SampleText2.txt",
        "Line": 0
    }

Contents of ``SampleText3.txt.out`` with line indents for readability::

    {
        "Entities": [
            {
            "BeginOffset": 0,
            "EndOffset": 4,
            "Type": "NAME",
            "Score": 0.999949934606805
            },
            {
            "BeginOffset": 77,
            "EndOffset": 88,
            "Type": "ADDRESS",
            "Score": 0.9999035300466904
            },
            {
            "BeginOffset": 120,
            "EndOffset": 125,
            "Type": "NAME",
            "Score": 0.9998203838716296
            },
            {
            "BeginOffset": 129,
            "EndOffset": 144,
            "Type": "EMAIL",
            "Score": 0.9998313473105228
            }
        ],
        "File": "SampleText3.txt",
        "Line": 0
    }
    
For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.


