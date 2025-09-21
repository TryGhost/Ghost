**Example 1: To detect medication entities and link to RxNorm directly from text**

The following ``infer-rx-norm`` example shows and labels the detected medication entities and links those entities to concept identifiers (RxCUI) from the National Library of Medicine RxNorm database. ::

    aws comprehendmedical infer-rx-norm \
        --text "Patient reports taking Levothyroxine 125 micrograms p.o. once daily, but denies taking Synthroid."

Output::

    {
        "Entities": [
            {
                "Id": 0,
                "Text": "Levothyroxine",
                "Category": "MEDICATION",
                "Type": "GENERIC_NAME",
                "Score": 0.9996285438537598,
                "BeginOffset": 23,
                "EndOffset": 36,
                "Attributes": [
                    {
                        "Type": "DOSAGE",
                        "Score": 0.9892290830612183,
                        "RelationshipScore": 0.9997978806495667,
                        "Id": 1,
                        "BeginOffset": 37,
                        "EndOffset": 51,
                        "Text": "125 micrograms",
                        "Traits": []
                    },
                    {
                        "Type": "ROUTE_OR_MODE",
                        "Score": 0.9988924860954285,
                        "RelationshipScore": 0.998291552066803,
                        "Id": 2,
                        "BeginOffset": 52,
                        "EndOffset": 56,
                        "Text": "p.o.",
                        "Traits": []
                    },
                    {
                        "Type": "FREQUENCY",
                        "Score": 0.9953463673591614,
                        "RelationshipScore": 0.9999889135360718,
                        "Id": 3,
                        "BeginOffset": 57,
                        "EndOffset": 67,
                        "Text": "once daily",
                        "Traits": []
                    }
                ],
                "Traits": [],
                "RxNormConcepts": [
                    {
                        "Description": "Levothyroxine Sodium 0.125 MG Oral Tablet",
                        "Code": "966224",
                        "Score": 0.9912070631980896
                    },
                    {
                        "Description": "Levothyroxine Sodium 0.125 MG Oral Capsule",
                        "Code": "966405",
                        "Score": 0.8698278665542603
                    },
                    {
                        "Description": "Levothyroxine Sodium 0.125 MG Oral Tablet [Synthroid]",
                        "Code": "966191",
                        "Score": 0.7448257803916931
                    },
                    {
                        "Description": "levothyroxine",
                        "Code": "10582",
                        "Score": 0.7050482630729675
                    },
                    {
                        "Description": "Levothyroxine Sodium 0.125 MG Oral Tablet [Levoxyl]",
                        "Code": "966190",
                        "Score": 0.6921631693840027
                    }
                ]
            },
            {
                "Id": 4,
                "Text": "Synthroid",
                "Category": "MEDICATION",
                "Type": "BRAND_NAME",
                "Score": 0.9946461319923401,
                "BeginOffset": 86,
                "EndOffset": 95,
                "Attributes": [],
                "Traits": [
                    {
                        "Name": "NEGATION",
                        "Score": 0.5167351961135864
                    }
                ],
                "RxNormConcepts": [
                    {
                        "Description": "Synthroid",
                        "Code": "224920",
                        "Score": 0.9462039470672607
                    },
                    {
                        "Description": "Levothyroxine Sodium 0.088 MG Oral Tablet [Synthroid]",
                        "Code": "966282",
                        "Score": 0.8309829235076904
                    },
                    {
                        "Description": "Levothyroxine Sodium 0.125 MG Oral Tablet [Synthroid]",
                        "Code": "966191",
                        "Score": 0.4945160448551178
                    },
                    {
                        "Description": "Levothyroxine Sodium 0.05 MG Oral Tablet [Synthroid]",
                        "Code": "966247",
                        "Score": 0.3674522042274475
                    },
                    {
                        "Description": "Levothyroxine Sodium 0.025 MG Oral Tablet [Synthroid]",
                        "Code": "966158",
                        "Score": 0.2588822841644287
                    }
                ]
            }
        ],
        "ModelVersion": "0.0.0"
    }

For more information, see `Infer RxNorm <https://docs.aws.amazon.com/comprehend/latest/dg/ontology-linking-rxnorm.html>`__ in the *Amazon Comprehend Medical Developer Guide*.

**Example 2: To detect medication entities and link to RxNorm from a file path.**

The following ``infer-rx-norm`` example shows and labels the detected medication entities and links those entities to concept identifiers (RxCUI) from the National Library of Medicine RxNorm database. ::

    aws comprehendmedical infer-rx-norm \
        --text file://rxnorm.txt

Contents of ``rxnorm.txt``::

    {
        "Patient reports taking Levothyroxine 125 micrograms p.o. once daily, but denies taking Synthroid."
    }

Output::

    {
        "Entities": [
            {
                "Id": 0,
                "Text": "Levothyroxine",
                "Category": "MEDICATION",
                "Type": "GENERIC_NAME",
                "Score": 0.9996285438537598,
                "BeginOffset": 23,
                "EndOffset": 36,
                "Attributes": [
                    {
                        "Type": "DOSAGE",
                        "Score": 0.9892290830612183,
                        "RelationshipScore": 0.9997978806495667,
                        "Id": 1,
                        "BeginOffset": 37,
                        "EndOffset": 51,
                        "Text": "125 micrograms",
                        "Traits": []
                    },
                    {
                        "Type": "ROUTE_OR_MODE",
                        "Score": 0.9988924860954285,
                        "RelationshipScore": 0.998291552066803,
                        "Id": 2,
                        "BeginOffset": 52,
                        "EndOffset": 56,
                        "Text": "p.o.",
                        "Traits": []
                    },
                    {
                        "Type": "FREQUENCY",
                        "Score": 0.9953463673591614,
                        "RelationshipScore": 0.9999889135360718,
                        "Id": 3,
                        "BeginOffset": 57,
                        "EndOffset": 67,
                        "Text": "once daily",
                        "Traits": []
                    }
                ],
                "Traits": [],
                "RxNormConcepts": [
                    {
                        "Description": "Levothyroxine Sodium 0.125 MG Oral Tablet",
                        "Code": "966224",
                        "Score": 0.9912070631980896
                    },
                    {
                        "Description": "Levothyroxine Sodium 0.125 MG Oral Capsule",
                        "Code": "966405",
                        "Score": 0.8698278665542603
                    },
                    {
                        "Description": "Levothyroxine Sodium 0.125 MG Oral Tablet [Synthroid]",
                        "Code": "966191",
                        "Score": 0.7448257803916931
                    },
                    {
                        "Description": "levothyroxine",
                        "Code": "10582",
                        "Score": 0.7050482630729675
                    },
                    {
                        "Description": "Levothyroxine Sodium 0.125 MG Oral Tablet [Levoxyl]",
                        "Code": "966190",
                        "Score": 0.6921631693840027
                    }
                ]
            },
            {
                "Id": 4,
                "Text": "Synthroid",
                "Category": "MEDICATION",
                "Type": "BRAND_NAME",
                "Score": 0.9946461319923401,
                "BeginOffset": 86,
                "EndOffset": 95,
                "Attributes": [],
                "Traits": [
                    {
                        "Name": "NEGATION",
                        "Score": 0.5167351961135864
                    }
                ],
                "RxNormConcepts": [
                    {
                        "Description": "Synthroid",
                        "Code": "224920",
                        "Score": 0.9462039470672607
                    },
                    {
                        "Description": "Levothyroxine Sodium 0.088 MG Oral Tablet [Synthroid]",
                        "Code": "966282",
                        "Score": 0.8309829235076904
                    },
                    {
                        "Description": "Levothyroxine Sodium 0.125 MG Oral Tablet [Synthroid]",
                        "Code": "966191",
                        "Score": 0.4945160448551178
                    },
                    {
                        "Description": "Levothyroxine Sodium 0.05 MG Oral Tablet [Synthroid]",
                        "Code": "966247",
                        "Score": 0.3674522042274475
                    },
                    {
                        "Description": "Levothyroxine Sodium 0.025 MG Oral Tablet [Synthroid]",
                        "Code": "966158",
                        "Score": 0.2588822841644287
                    }
                ]
            }
        ],
        "ModelVersion": "0.0.0"
    }

For more information, see `Infer RxNorm <https://docs.aws.amazon.com/comprehend-medical/latest/dev/ontology-RxNorm.html>`__ in the *Amazon Comprehend Medical Developer Guide*.