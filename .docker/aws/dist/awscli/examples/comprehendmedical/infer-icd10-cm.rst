**Example 1: To detect medical condition entities and link to the ICD-10-CM Ontology directly from text**

The following ``infer-icd10-cm`` example labels the detected medical condition entities and links those entities with codes in the 2019 edition of the International Classification of Diseases Clinical Modification (ICD-10-CM). ::

    aws comprehendmedical infer-icd10-cm \
        --text "The patient complains of abdominal pain, has a long-standing history of diabetes treated with Micronase daily."

Output::

    {
        "Entities": [
            {
                "Id": 0,
                "Text": "abdominal pain",
                "Category": "MEDICAL_CONDITION",
                "Type": "DX_NAME",
                "Score": 0.9475538730621338,
                "BeginOffset": 28,
                "EndOffset": 42,
                "Attributes": [],
                "Traits": [
                    {
                        "Name": "SYMPTOM",
                        "Score": 0.6724207401275635
                    }
                ],
                "ICD10CMConcepts": [
                    {
                        "Description": "Unspecified abdominal pain",
                        "Code": "R10.9",
                        "Score": 0.6904221177101135
                    },
                    {
                        "Description": "Epigastric pain",
                        "Code": "R10.13",
                        "Score": 0.1364113688468933
                    },
                    {
                        "Description": "Generalized abdominal pain",
                        "Code": "R10.84",
                        "Score": 0.12508003413677216
                    },
                    {
                        "Description": "Left lower quadrant pain",
                        "Code": "R10.32",
                        "Score": 0.10063883662223816
                    },
                    {
                        "Description": "Lower abdominal pain, unspecified",
                        "Code": "R10.30",
                        "Score": 0.09933677315711975
                    }
                ]
            },
            {
                "Id": 1,
                "Text": "diabetes",
                "Category": "MEDICAL_CONDITION",
                "Type": "DX_NAME",
                "Score": 0.9899052977561951,
                "BeginOffset": 75,
                "EndOffset": 83,
                "Attributes": [],
                "Traits": [
                    {
                        "Name": "DIAGNOSIS",
                        "Score": 0.9258432388305664
                    }
                ],
                "ICD10CMConcepts": [
                    {
                        "Description": "Type 2 diabetes mellitus without complications",
                        "Code": "E11.9",
                        "Score": 0.7158446311950684
                    },
                    {
                        "Description": "Family history of diabetes mellitus",
                        "Code": "Z83.3",
                        "Score": 0.5704703330993652
                    },
                    {
                        "Description": "Family history of other endocrine, nutritional and metabolic diseases",
                        "Code": "Z83.49",
                        "Score": 0.19856023788452148
                    },
                    {
                        "Description": "Type 1 diabetes mellitus with ketoacidosis without coma",
                        "Code": "E10.10",
                        "Score": 0.13285516202449799
                    },
                    {
                        "Description": "Type 2 diabetes mellitus with hyperglycemia",
                        "Code": "E11.65",
                        "Score": 0.0993388369679451
                    }
                ]
            }
        ],
        "ModelVersion": "0.1.0"
    }

For more information, see `Infer ICD10-CM <https://docs.aws.amazon.com/comprehend/latest/dg/ontology-linking-icd10.html>`__ in the *Amazon Comprehend Medical Developer Guide*.

**Example 2: To detect medical condition entities and link to the ICD-10-CM Ontology from a file pathway**

The following ``infer-icd-10-cm`` example labels the detected medical condition entities and links those entities with codes in the 2019 edition of the International Classification of Diseases Clinical Modification (ICD-10-CM). ::

    aws comprehendmedical infer-icd10-cm \
        --text file://icd10cm.txt

Contents of ``icd10cm.txt``::

    {
        "The patient complains of abdominal pain, has a long-standing history of diabetes treated with Micronase daily."
    }

Output::

    {
        "Entities": [
            {
                "Id": 0,
                "Text": "abdominal pain",
                "Category": "MEDICAL_CONDITION",
                "Type": "DX_NAME",
                "Score": 0.9475538730621338,
                "BeginOffset": 28,
                "EndOffset": 42,
                "Attributes": [],
                "Traits": [
                    {
                        "Name": "SYMPTOM",
                        "Score": 0.6724207401275635
                    }
                ],
                "ICD10CMConcepts": [
                    {
                        "Description": "Unspecified abdominal pain",
                        "Code": "R10.9",
                        "Score": 0.6904221177101135
                    },
                    {
                        "Description": "Epigastric pain",
                        "Code": "R10.13",
                        "Score": 0.1364113688468933
                    },
                    {
                        "Description": "Generalized abdominal pain",
                        "Code": "R10.84",
                        "Score": 0.12508003413677216
                    },
                    {
                        "Description": "Left lower quadrant pain",
                        "Code": "R10.32",
                        "Score": 0.10063883662223816
                    },
                    {
                        "Description": "Lower abdominal pain, unspecified",
                        "Code": "R10.30",
                        "Score": 0.09933677315711975
                    }
                ]
            },
            {
                "Id": 1,
                "Text": "diabetes",
                "Category": "MEDICAL_CONDITION",
                "Type": "DX_NAME",
                "Score": 0.9899052977561951,
                "BeginOffset": 75,
                "EndOffset": 83,
                "Attributes": [],
                "Traits": [
                    {
                        "Name": "DIAGNOSIS",
                        "Score": 0.9258432388305664
                    }
                ],
                "ICD10CMConcepts": [
                    {
                        "Description": "Type 2 diabetes mellitus without complications",
                        "Code": "E11.9",
                        "Score": 0.7158446311950684
                    },
                    {
                        "Description": "Family history of diabetes mellitus",
                        "Code": "Z83.3",
                        "Score": 0.5704703330993652
                    },
                    {
                        "Description": "Family history of other endocrine, nutritional and metabolic diseases",
                        "Code": "Z83.49",
                        "Score": 0.19856023788452148
                    },
                    {
                        "Description": "Type 1 diabetes mellitus with ketoacidosis without coma",
                        "Code": "E10.10",
                        "Score": 0.13285516202449799
                    },
                    {
                        "Description": "Type 2 diabetes mellitus with hyperglycemia",
                        "Code": "E11.65",
                        "Score": 0.0993388369679451
                    }
                ]
            }
        ],
        "ModelVersion": "0.1.0"
    }

For more information, see `Infer-ICD10-CM <https://docs.aws.amazon.com/comprehend-medical/latest/dev/ontology-icd10.html>`__ in the *Amazon Comprehend Medical Developer Guide*.