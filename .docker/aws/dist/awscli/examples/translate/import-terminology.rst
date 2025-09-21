**To import a custom terminology from a file**

The following ``import-terminology`` example  creates a terminology called ``MyTestTerminology`` from the ``test-terminology.csv`` file: ::

    aws translate import-terminology \
        --name MyTestTerminology \
        --description "Creating a test terminology in AWS Translate" \
        --merge-strategy OVERWRITE \
        --data-file fileb://test-terminology.csv \
        --terminology-data Format=CSV

Contents of ``test-terminology.csv``:

    en,fr,es,zh
    Hello world!,Bonjour tout le monde!,Hola Mundo!,????
    Amazon,Amazon,Amazon,Amazon

Output::

    {
        "TerminologyProperties": {
            "SourceLanguageCode": "en",
            "Name": "MyTestTerminology",
            "TargetLanguageCodes": [
                "fr",
                "es",
                "zh"
            ],
            "SizeBytes": 97,
            "LastUpdatedAt": 1571089500.851,
            "CreatedAt": 1571089500.851,
            "TermCount": 6,
            "Arn": "arn:aws:translate:us-west-2:123456789012:terminology/MyTestTerminology/LATEST",
            "Description": "Creating a test terminology in AWS Translate"
        }
    }
