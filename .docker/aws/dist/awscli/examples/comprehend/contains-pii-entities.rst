**To analyze the input text for the presence of PII information**

The following ``contains-pii-entities`` example analyzes the input text for the presence of personally identifiable information (PII) and returns the labels of identified PII entity types such as name, address, bank account number, or phone number. ::

    aws comprehend contains-pii-entities \
        --language-code en \
        --text "Hello Zhang Wei, I am John. Your AnyCompany Financial Services, LLC credit card
            account 1111-XXXX-1111-XXXX has a minimum payment of $24.53 that is due by July 31st. Based on your autopay settings,
            we will withdraw your payment on the due date from your bank account number XXXXXX1111 with the routing number XXXXX0000.
            Customer feedback for Sunshine Spa, 100 Main St, Anywhere. Send comments to Alice at AnySpa@example.com."

Output::

    {
        "Labels": [
            {
                "Name": "NAME",
                "Score": 1.0
            },
            {
                "Name": "EMAIL",
                "Score": 1.0
            },
            {
                "Name": "BANK_ACCOUNT_NUMBER",
                "Score": 0.9995794296264648
            },
            {
                "Name": "BANK_ROUTING",
                "Score": 0.9173126816749573
            },
            {
                "Name": "CREDIT_DEBIT_NUMBER",
                "Score": 1.0
            }
    }

For more information, see `Personally Identifiable Information (PII) <https://docs.aws.amazon.com/comprehend/latest/dg/pii.html>`__ in the *Amazon Comprehend Developer Guide*.