**To start document classification job**

The following ``start-document-classification-job`` example starts a document classification job with a custom model on all of the files at the address specified by the ``--input-data-config`` tag. 
In this example, the input S3 bucket contains ``SampleSMStext1.txt``, ``SampleSMStext2.txt``, and ``SampleSMStext3.txt``. The model was previously trained on document classifications 
of spam and non-spam, or, "ham", SMS messages. When the job is complete, ``output.tar.gz`` is put at the location specified by the ``--output-data-config`` tag. ``output.tar.gz`` contains ``predictions.jsonl`` 
which lists the classification of each document. The Json output is printed on one line per file, but is formatted here for readability. ::

    aws comprehend start-document-classification-job \
        --job-name exampleclassificationjob \
        --input-data-config "S3Uri=s3://amzn-s3-demo-bucket-INPUT/jobdata/" \
        --output-data-config "S3Uri=s3://amzn-s3-demo-destination-bucket/testfolder/" \
        --data-access-role-arn arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role \
        --document-classifier-arn arn:aws:comprehend:us-west-2:111122223333:document-classifier/mymodel/version/12

Contents of ``SampleSMStext1.txt``::

    "CONGRATULATIONS! TXT 2155550100 to win $5000"

Contents of ``SampleSMStext2.txt``::

    "Hi, when do you want me to pick you up from practice?"

Contents of ``SampleSMStext3.txt``::

    "Plz send bank account # to 2155550100 to claim prize!!"

Output::

    {
        "JobId": "e758dd56b824aa717ceab551fEXAMPLE",
        "JobArn": "arn:aws:comprehend:us-west-2:111122223333:document-classification-job/e758dd56b824aa717ceab551fEXAMPLE",
        "JobStatus": "SUBMITTED"
    }

Contents of ``predictions.jsonl``::

    {"File": "SampleSMSText1.txt", "Line": "0", "Classes": [{"Name": "spam", "Score": 0.9999}, {"Name": "ham", "Score": 0.0001}]}
    {"File": "SampleSMStext2.txt", "Line": "0", "Classes": [{"Name": "ham", "Score": 0.9994}, {"Name": "spam", "Score": 0.0006}]}
    {"File": "SampleSMSText3.txt", "Line": "0", "Classes": [{"Name": "spam", "Score": 0.9999}, {"Name": "ham", "Score": 0.0001}]}

For more information, see `Custom Classification <https://docs.aws.amazon.com/comprehend/latest/dg/how-document-classification.html>`__ in the *Amazon Comprehend Developer Guide*.