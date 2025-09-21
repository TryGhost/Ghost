**To retrieve the content of a lexicon**

The following ``get-lexicon`` example retrieves the content of the specified pronunciation lexicon. ::

    aws polly get-lexicon \
        --name w3c

Output::

    {
        "Lexicon": {
            "Content": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<lexicon version=\"1.0\" \n      xmlns=    \"http://www.w3.org/2005/01/pronunciation-lexicon\"\n      xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" \n          xsi:schemaLocation=\"http://www.w3.org/2005/01/pronunciation-lexicon \n        http://www.w3.org/TR/2007/CR-pronunciation-    lexicon-20071212/pls.xsd\"\n      alphabet=\"ipa\" \n      xml:lang=\"en-US\">\n  <lexeme>\n    <grapheme>W3C</grapheme>\n        <alias>World Wide Web Consortium</alias>\n  </lexeme>\n</lexicon>\n",
            "Name": "w3c"
        },
        "LexiconAttributes": {
            "Alphabet": "ipa",
            "LanguageCode": "en-US",
            "LastModified": 1603908910.99,
            "LexiconArn": "arn:aws:polly:us-west-2:880185128111:lexicon/w3c",
            "LexemesCount": 1,
            "Size": 492
        }
    }

For more information, see `Using the GetLexicon operation <https://docs.aws.amazon.com/polly/latest/dg/gs-get-lexicon.html>`__ in the *Amazon Polly Developer Guide*.
