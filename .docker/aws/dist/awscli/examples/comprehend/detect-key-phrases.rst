**To detect key phrases in input text**

The following ``detect-key-phrases`` example analyzes the input text and identifies the key noun phrases. The pre-trained model's confidence score is also 
output for each prediction. ::

    aws comprehend detect-key-phrases \
        --language-code en \
        --text "Hello Zhang Wei, I am John. Your AnyCompany Financial Services, LLC credit card \
            account 1111-XXXX-1111-XXXX has a minimum payment of $24.53 that is due by July 31st. Based on your autopay settings, \
            we will withdraw your payment on the due date from your bank account number XXXXXX1111 with the routing number XXXXX0000. \
            Customer feedback for Sunshine Spa, 123 Main St, Anywhere. Send comments to Alice at AnySpa@example.com."

Output::

    {
        "KeyPhrases": [
            {
                "Score": 0.8996376395225525,
                "Text": "Zhang Wei",
                "BeginOffset": 6,
                "EndOffset": 15
            },
            {
                "Score": 0.9992469549179077,
                "Text": "John",
                "BeginOffset": 22,
                "EndOffset": 26
            },
            {
                "Score": 0.988385021686554,
                "Text": "Your AnyCompany Financial Services",
                "BeginOffset": 28,
                "EndOffset": 62
            },
            {
                "Score": 0.8740853071212769,
                "Text": "LLC credit card account 1111-XXXX-1111-XXXX",
                "BeginOffset": 64,
                "EndOffset": 107
            },
            {
                "Score": 0.9999437928199768,
                "Text": "a minimum payment",
                "BeginOffset": 112,
                "EndOffset": 129
            },
            {
                "Score": 0.9998900890350342,
                "Text": ".53",
                "BeginOffset": 133,
                "EndOffset": 136
            },
            {
                "Score": 0.9979453086853027,
                "Text": "July 31st",
                "BeginOffset": 152,
                "EndOffset": 161
            },
            {
                "Score": 0.9983011484146118,
                "Text": "your autopay settings",
                "BeginOffset": 172,
                "EndOffset": 193
            },
            {
                "Score": 0.9996572136878967,
                "Text": "your payment",
                "BeginOffset": 211,
                "EndOffset": 223
            },
            {
                "Score": 0.9995037317276001,
                "Text": "the due date",
                "BeginOffset": 227,
                "EndOffset": 239
            },
            {
                "Score": 0.9702621698379517,
                "Text": "your bank account number XXXXXX1111",
                "BeginOffset": 245,
                "EndOffset": 280
            },
            {
                "Score": 0.9179925918579102,
                "Text": "the routing number XXXXX0000.Customer feedback",
                "BeginOffset": 286,
                "EndOffset": 332
            },
            {
                "Score": 0.9978160858154297,
                "Text": "Sunshine Spa",
                "BeginOffset": 337,
                "EndOffset": 349
            },
            {
                "Score": 0.9706913232803345,
                "Text": "123 Main St",
                "BeginOffset": 351,
                "EndOffset": 362
            },
            {
                "Score": 0.9941995143890381,
                "Text": "comments",
                "BeginOffset": 379,
                "EndOffset": 387
            },
            {
                "Score": 0.9759287238121033,
                "Text": "Alice",
                "BeginOffset": 391,
                "EndOffset": 396
            },
            {
                "Score": 0.8376792669296265,
                "Text": "AnySpa@example.com",
                "BeginOffset": 400,
                "EndOffset": 415
            }
        ]
    }

For more information, see `Key Phrases <https://docs.aws.amazon.com/comprehend/latest/dg/how-key-phrases.html>`__ in the *Amazon Comprehend Developer Guide*.