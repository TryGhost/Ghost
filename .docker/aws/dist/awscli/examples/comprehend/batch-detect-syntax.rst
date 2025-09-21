**To inspect the syntax and parts of speech of words in multiple input texts**

The following ``batch-detect-syntax`` example analyzes the syntax of multiple input texts and returns the different parts of speech. The pre-trained model's confidence score is also output for each prediction. ::

    aws comprehend batch-detect-syntax \
        --text-list "It is a beautiful day." "Can you please pass the salt?" "Please pay the bill before the 31st." \
        --language-code en

Output::

    {
        "ResultList": [
            {
                "Index": 0,
                "SyntaxTokens": [
                    {
                        "TokenId": 1,
                        "Text": "It",
                        "BeginOffset": 0,
                        "EndOffset": 2,
                        "PartOfSpeech": {
                            "Tag": "PRON",
                            "Score": 0.9999740719795227
                        }
                    },
                    {
                        "TokenId": 2,
                        "Text": "is",
                        "BeginOffset": 3,
                        "EndOffset": 5,
                        "PartOfSpeech": {
                            "Tag": "VERB",
                            "Score": 0.999937117099762
                        }
                    },
                    {
                        "TokenId": 3,
                        "Text": "a",
                        "BeginOffset": 6,
                        "EndOffset": 7,
                        "PartOfSpeech": {
                            "Tag": "DET",
                            "Score": 0.9999926686286926
                        }
                    },
                    {
                        "TokenId": 4,
                        "Text": "beautiful",
                        "BeginOffset": 8,
                        "EndOffset": 17,
                        "PartOfSpeech": {
                            "Tag": "ADJ",
                            "Score": 0.9987891912460327
                        }
                    },
                    {
                        "TokenId": 5,
                        "Text": "day",
                        "BeginOffset": 18,
                        "EndOffset": 21,
                        "PartOfSpeech": {
                            "Tag": "NOUN",
                            "Score": 0.9999778866767883
                        }
                    },
                    {
                        "TokenId": 6,
                        "Text": ".",
                        "BeginOffset": 21,
                        "EndOffset": 22,
                        "PartOfSpeech": {
                            "Tag": "PUNCT",
                            "Score": 0.9999974966049194
                        }
                    }
                ]
            },
            {
                "Index": 1,
                "SyntaxTokens": [
                    {
                        "TokenId": 1,
                        "Text": "Can",
                        "BeginOffset": 0,
                        "EndOffset": 3,
                        "PartOfSpeech": {
                            "Tag": "AUX",
                            "Score": 0.9999770522117615
                        }
                    },
                    {
                        "TokenId": 2,
                        "Text": "you",
                        "BeginOffset": 4,
                        "EndOffset": 7,
                        "PartOfSpeech": {
                            "Tag": "PRON",
                            "Score": 0.9999986886978149
                        }
                    },
                    {
                        "TokenId": 3,
                        "Text": "please",
                        "BeginOffset": 8,
                        "EndOffset": 14,
                        "PartOfSpeech": {
                            "Tag": "INTJ",
                            "Score": 0.9681622385978699
                        }
                    },
                    {
                        "TokenId": 4,
                        "Text": "pass",
                        "BeginOffset": 15,
                        "EndOffset": 19,
                        "PartOfSpeech": {
                            "Tag": "VERB",
                            "Score": 0.9999874830245972
                        }
                    },
                    {
                        "TokenId": 5,
                        "Text": "the",
                        "BeginOffset": 20,
                        "EndOffset": 23,
                        "PartOfSpeech": {
                            "Tag": "DET",
                            "Score": 0.9999827146530151
                        }
                    },
                    {
                        "TokenId": 6,
                        "Text": "salt",
                        "BeginOffset": 24,
                        "EndOffset": 28,
                        "PartOfSpeech": {
                            "Tag": "NOUN",
                            "Score": 0.9995040893554688
                        }
                    },
                    {
                        "TokenId": 7,
                        "Text": "?",
                        "BeginOffset": 28,
                        "EndOffset": 29,
                        "PartOfSpeech": {
                            "Tag": "PUNCT",
                            "Score": 0.999998152256012
                        }
                    }
                ]
            },
            {
                "Index": 2,
                "SyntaxTokens": [
                    {
                        "TokenId": 1,
                        "Text": "Please",
                        "BeginOffset": 0,
                        "EndOffset": 6,
                        "PartOfSpeech": {
                            "Tag": "INTJ",
                            "Score": 0.9997857809066772
                        }
                    },
                    {
                        "TokenId": 2,
                        "Text": "pay",
                        "BeginOffset": 7,
                        "EndOffset": 10,
                        "PartOfSpeech": {
                            "Tag": "VERB",
                            "Score": 0.9999252557754517
                        }
                    },
                    {
                        "TokenId": 3,
                        "Text": "the",
                        "BeginOffset": 11,
                        "EndOffset": 14,
                        "PartOfSpeech": {
                            "Tag": "DET",
                            "Score": 0.9999842643737793
                        }
                    },
                    {
                        "TokenId": 4,
                        "Text": "bill",
                        "BeginOffset": 15,
                        "EndOffset": 19,
                        "PartOfSpeech": {
                            "Tag": "NOUN",
                            "Score": 0.9999588131904602
                        }
                    },
                    {
                        "TokenId": 5,
                        "Text": "before",
                        "BeginOffset": 20,
                        "EndOffset": 26,
                        "PartOfSpeech": {
                            "Tag": "ADP",
                            "Score": 0.9958304762840271
                        }
                    },
                    {
                        "TokenId": 6,
                        "Text": "the",
                        "BeginOffset": 27,
                        "EndOffset": 30,
                        "PartOfSpeech": {
                            "Tag": "DET",
                            "Score": 0.9999947547912598
                        }
                    },
                    {
                        "TokenId": 7,
                        "Text": "31st",
                        "BeginOffset": 31,
                        "EndOffset": 35,
                        "PartOfSpeech": {
                            "Tag": "NOUN",
                            "Score": 0.9924124479293823
                        }
                    },
                    {
                        "TokenId": 8,
                        "Text": ".",
                        "BeginOffset": 35,
                        "EndOffset": 36,
                        "PartOfSpeech": {
                            "Tag": "PUNCT",
                            "Score": 0.9999955892562866
                        }
                    }
                ]
            }
        ],
        "ErrorList": []
    }


For more information, see `Syntax Analysis <https://docs.aws.amazon.com/comprehend/latest/dg/how-syntax.html>`__ in the *Amazon Comprehend Developer Guide*.