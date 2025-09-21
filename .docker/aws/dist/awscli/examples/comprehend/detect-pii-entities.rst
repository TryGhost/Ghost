**To detect pii entities in input text**

The following ``detect-pii-entities`` example analyzes the input text and identifies entities that contain personally identifiable information (PII). The pre-trained model's 
confidence score is also output for each prediction. ::

    aws comprehend detect-pii-entities \
        --language-code en \
        --text "Hello Zhang Wei, I am John. Your AnyCompany Financial Services, LLC credit card \
            account 1111-XXXX-1111-XXXX has a minimum payment of $24.53 that is due by July 31st. Based on your autopay settings, \
            we will withdraw your payment on the due date from your bank account number XXXXXX1111 with the routing number XXXXX0000. \
            Customer feedback for Sunshine Spa, 123 Main St, Anywhere. Send comments to Alice at AnySpa@example.com."

Output:: 

    {
        "Entities": [
            {
                "Score": 0.9998322129249573,
                "Type": "NAME",
                "BeginOffset": 6,
                "EndOffset": 15
            },
            {
                "Score": 0.9998878240585327,
                "Type": "NAME",
                "BeginOffset": 22,
                "EndOffset": 26
            },
            {
                "Score": 0.9994089603424072,
                "Type": "CREDIT_DEBIT_NUMBER",
                "BeginOffset": 88,
                "EndOffset": 107
            },
            {
                "Score": 0.9999760985374451,
                "Type": "DATE_TIME",
                "BeginOffset": 152,
                "EndOffset": 161
            },
            {
                "Score": 0.9999449253082275,
                "Type": "BANK_ACCOUNT_NUMBER",
                "BeginOffset": 271,
                "EndOffset": 281
            },
            {
                "Score": 0.9999847412109375,
                "Type": "BANK_ROUTING",
                "BeginOffset": 306,
                "EndOffset": 315
            },
            {
                "Score": 0.999925434589386,
                "Type": "ADDRESS",
                "BeginOffset": 354,
                "EndOffset": 365
            },
            {
                "Score": 0.9989161491394043,
                "Type": "NAME",
                "BeginOffset": 394,
                "EndOffset": 399
            },
            {
                "Score": 0.9994171857833862,
                "Type": "EMAIL",
                "BeginOffset": 403,
                "EndOffset": 418
            }
        ]
    }

For more information, see `Personally Identifiable Information (PII) <https://docs.aws.amazon.com/comprehend/latest/dg/pii.html>`__ in the *Amazon Comprehend Developer Guide*.