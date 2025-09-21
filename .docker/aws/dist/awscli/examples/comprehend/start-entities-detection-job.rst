**Example 1: To start a standard entity detection job using the pre-trained model**

The following ``start-entities-detection-job`` example starts an asynchronous entities detection job for all files located at the address specified by
the ``--input-data-config`` tag. The S3 bucket in this example contains ``Sampletext1.txt``, ``Sampletext2.txt``, and ``Sampletext3.txt``. 
When the job is complete, the folder, ``output``, is placed in the location specified by the ``--output-data-config`` tag. The folder contains 
``output.txt`` which lists all of the named entities detected within each text file as well as the pre-trained model's confidence score for each prediction. 
The Json output is printed on one line per input file, but is formatted here for readability. ::

    aws comprehend start-entities-detection-job \
        --job-name entitiestest \
        --language-code en \
        --input-data-config "S3Uri=s3://amzn-s3-demo-bucket/" \
        --output-data-config "S3Uri=s3://amzn-s3-demo-destination-bucket/testfolder/" \
        --data-access-role-arn arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role \
        --language-code en

Contents of ``Sampletext1.txt``::

    "Hello Zhang Wei, I am John. Your AnyCompany Financial Services, LLC credit card account 1111-XXXX-1111-XXXX has a minimum payment of $24.53 that is due by July 31st."

Contents of ``Sampletext2.txt``::

    "Dear Max, based on your autopay settings for your account example1.org account, we will withdraw your payment on the due date from your bank account number XXXXXX1111 with the routing number XXXXX0000. "

Contents of ``Sampletext3.txt``:: 

    "Jane, please submit any customer feedback from this weekend to AnySpa, 123 Main St, Anywhere and send comments to Alice at AnySpa@example.com."

Output::

    {
        "JobId": "123456abcdeb0e11022f22a11EXAMPLE",
        "JobArn": "arn:aws:comprehend:us-west-2:111122223333:entities-detection-job/123456abcdeb0e11022f22a11EXAMPLE",
        "JobStatus": "SUBMITTED"
    }

Contents of ``output.txt`` with line indents for readability::

    {
    "Entities": [
        {
        "BeginOffset": 6,
        "EndOffset": 15,
        "Score": 0.9994006636420306,
        "Text": "Zhang Wei",
        "Type": "PERSON"
        },
        {
        "BeginOffset": 22,
        "EndOffset": 26,
        "Score": 0.9976647915128143,
        "Text": "John",
        "Type": "PERSON"
        },
        {
        "BeginOffset": 33,
        "EndOffset": 67,
        "Score": 0.9984608700836206,
        "Text": "AnyCompany Financial Services, LLC",
        "Type": "ORGANIZATION"
        },
        {
        "BeginOffset": 88,
        "EndOffset": 107,
        "Score": 0.9868521019555556,
        "Text": "1111-XXXX-1111-XXXX",
        "Type": "OTHER"
        },
        {
        "BeginOffset": 133,
        "EndOffset": 139,
        "Score": 0.998242565709204,
        "Text": "$24.53",
        "Type": "QUANTITY"
        },
        {
        "BeginOffset": 155,
        "EndOffset": 164,
        "Score": 0.9993039263159287,
        "Text": "July 31st",
        "Type": "DATE"
        }
    ],
    "File": "SampleText1.txt",
    "Line": 0
    }
    {
    "Entities": [
        {
        "BeginOffset": 5,
        "EndOffset": 8,
        "Score": 0.9866232147545232,
        "Text": "Max",
        "Type": "PERSON"
        },
        {
        "BeginOffset": 156,
        "EndOffset": 166,
        "Score": 0.9797723450933329,
        "Text": "XXXXXX1111",
        "Type": "OTHER"
        },
        {
        "BeginOffset": 191,
        "EndOffset": 200,
        "Score": 0.9247838572396843,
        "Text": "XXXXX0000",
        "Type": "OTHER"
        }
    ],
    "File": "SampleText2.txt",
    "Line": 0
    }
    {
     "Entities": [
        {
        "Score": 0.9990532994270325,
        "Type": "PERSON",
        "Text": "Jane",
        "BeginOffset": 0,
        "EndOffset": 4
        },
        {
        "Score": 0.9519651532173157,
        "Type": "DATE",
        "Text": "this weekend",
        "BeginOffset": 47,
        "EndOffset": 59
        },
        {
        "Score": 0.5566426515579224,
        "Type": "ORGANIZATION",
        "Text": "AnySpa",
        "BeginOffset": 63,
        "EndOffset": 69
        },
        {
        "Score": 0.8059805631637573,
        "Type": "LOCATION",
        "Text": "123 Main St, Anywhere",
        "BeginOffset": 71,
        "EndOffset": 92
        },
        {
        "Score": 0.998830258846283,
        "Type": "PERSON",
        "Text": "Alice",
        "BeginOffset": 114,
        "EndOffset": 119
        },
        {
        "Score": 0.997818112373352,
        "Type": "OTHER",
        "Text": "AnySpa@example.com",
        "BeginOffset": 123,
        "EndOffset": 138
        }
        ],
        "File": "SampleText3.txt",
        "Line": 0
    }
    

For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.

**Example 2: To start a custom entity detection job**

The following ``start-entities-detection-job`` example starts an asynchronous custom entities detection job for all files located at the address specified by
the ``--input-data-config`` tag. In this example, the S3 bucket in this example contains ``SampleFeedback1.txt``, ``SampleFeedback2.txt``, and ``SampleFeedback3.txt``. 
The entity recognizer model was trained on customer support Feedbacks to recognize device names. When the job is complete, an the folder, ``output``, is put at the location specified by the ``--output-data-config`` tag. The folder contains 
``output.txt``, which lists all of the named entities detected within each text file as well as the pre-trained model's confidence score for each prediction. The Json output is printed on one line per file, but is formatted here for readability. ::

    aws comprehend start-entities-detection-job \
        --job-name customentitiestest \
        --entity-recognizer-arn "arn:aws:comprehend:us-west-2:111122223333:entity-recognizer/entityrecognizer" \
        --language-code en \
        --input-data-config "S3Uri=s3://amzn-s3-demo-bucket/jobdata/" \
        --output-data-config "S3Uri=s3://amzn-s3-demo-destination-bucket/testfolder/" \
        --data-access-role-arn "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-IOrole" 

Contents of ``SampleFeedback1.txt``::

    "I've been on the AnyPhone app have had issues for 24 hours when trying to pay bill. Cannot make payment. Sigh. | Oh man! Lets get that app up and running. DM me, and we can get to work!"

Contents of ``SampleFeedback2.txt``::

    "Hi, I have a discrepancy with my new bill. Could we get it sorted out? A rep added stuff I didnt sign up for when I did my AnyPhone 10 upgrade. | We can absolutely get this sorted!"

Contents of ``SampleFeedback3.txt``::

    "Is the by 1 get 1 free AnySmartPhone promo still going on? | Hi Christian! It ended yesterday, send us a DM if you have any questions and we can take a look at your options!"

Output::

    {
        "JobId": "019ea9edac758806850fa8a79ff83021",
        "JobArn": "arn:aws:comprehend:us-west-2:111122223333:entities-detection-job/019ea9edac758806850fa8a79ff83021",
        "JobStatus": "SUBMITTED"
    }

Contents of ``output.txt`` with line indents for readability::

    {
    "Entities": [
        {
        "BeginOffset": 17,
        "EndOffset": 25,
        "Score": 0.9999728210205924,
        "Text": "AnyPhone",
        "Type": "DEVICE"
        }
    ],
    "File": "SampleFeedback1.txt",
    "Line": 0
    }
    {
    "Entities": [
        {
        "BeginOffset": 123,
        "EndOffset": 133,
        "Score": 0.9999892116761524,
        "Text": "AnyPhone 10",
        "Type": "DEVICE"
        }
    ],
    "File": "SampleFeedback2.txt",
    "Line": 0
    }
    {
    "Entities": [
        {
        "BeginOffset": 23,
        "EndOffset": 35,
        "Score": 0.9999971389852362,
        "Text": "AnySmartPhone",
        "Type": "DEVICE"
        }
    ],
    "File": "SampleFeedback3.txt",
    "Line": 0
    }

For more information, see `Custom entity recognition <https://docs.aws.amazon.com/comprehend/latest/dg/custom-entity-recognition.html>`__ in the *Amazon Comprehend Developer Guide*.