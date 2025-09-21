**To detect named entities in input text**

The following ``detect-entities`` example analyzes the input text and returns the named entities. The pre-trained model's confidence score
is also output for each prediction. ::

    aws comprehend detect-entities \
        --language-code en \
        --text "Hello Zhang Wei, I am John. Your AnyCompany Financial Services, LLC credit card \
        account 1111-XXXX-1111-XXXX has a minimum payment of $24.53 that is due by July 31st. Based on your autopay settings, \
        we will withdraw your payment on the due date from your bank account number XXXXXX1111 with the routing number XXXXX0000. \
        Customer feedback for Sunshine Spa, 123 Main St, Anywhere. Send comments to Alice at AnySpa@example.com."

Output::

    {
        "Entities": [
            {
                "Score": 0.9994556307792664,
                "Type": "PERSON",
                "Text": "Zhang Wei",
                "BeginOffset": 6,
                "EndOffset": 15
            },
            {
                "Score": 0.9981022477149963,
                "Type": "PERSON",
                "Text": "John",
                "BeginOffset": 22,
                "EndOffset": 26
            },
            {
                "Score": 0.9986887574195862,
                "Type": "ORGANIZATION",
                "Text": "AnyCompany Financial Services, LLC",
                "BeginOffset": 33,
                "EndOffset": 67
            },
            {
                "Score": 0.9959119558334351,
                "Type": "OTHER",
                "Text": "1111-XXXX-1111-XXXX",
                "BeginOffset": 88,
                "EndOffset": 107
            },
            {
                "Score": 0.9708039164543152,
                "Type": "QUANTITY",
                "Text": ".53",
                "BeginOffset": 133,
                "EndOffset": 136
            },
            {
                "Score": 0.9987268447875977,
                "Type": "DATE",
                "Text": "July 31st",
                "BeginOffset": 152,
                "EndOffset": 161
            },
            {
                "Score": 0.9858865737915039,
                "Type": "OTHER",
                "Text": "XXXXXX1111",
                "BeginOffset": 271,
                "EndOffset": 281
            },
            {
                "Score": 0.9700471758842468,
                "Type": "OTHER",
                "Text": "XXXXX0000",
                "BeginOffset": 306,
                "EndOffset": 315
            },
            {
                "Score": 0.9591118693351746,
                "Type": "ORGANIZATION",
                "Text": "Sunshine Spa",
                "BeginOffset": 340,
                "EndOffset": 352
            },
            {
                "Score": 0.9797496795654297,
                "Type": "LOCATION",
                "Text": "123 Main St",
                "BeginOffset": 354,
                "EndOffset": 365
            },
            {
                "Score": 0.994929313659668,
                "Type": "PERSON",
                "Text": "Alice",
                "BeginOffset": 394,
                "EndOffset": 399
            },
            {
                "Score": 0.9949769377708435,
                "Type": "OTHER",
                "Text": "AnySpa@example.com",
                "BeginOffset": 403,
                "EndOffset": 418
            }
        ]
    }

For more information, see `Entities <https://docs.aws.amazon.com/comprehend/latest/dg/how-entities.html>`__ in the *Amazon Comprehend Developer Guide*.