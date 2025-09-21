**Example: To detect entities and link to the SNOMED CT Ontology directly from text**

The following ``infer-snomedct`` example shows how to detect medical entities and link them to concepts from the 2021-03 version of the Systematized Nomenclature of Medicine, Clinical Terms (SNOMED CT). ::

    aws comprehendmedical infer-snomedct \
        --text "The patient complains of abdominal pain, has a long-standing history of diabetes treated with Micronase daily."

Output::

    {
        "Entities": [
            {
                "Id": 3,
                "BeginOffset": 26,
                "EndOffset": 40,
                "Score": 0.9598260521888733,
                "Text": "abdominal pain",
                "Category": "MEDICAL_CONDITION",
                "Type": "DX_NAME",
                "Traits": [
                    {
                        "Name": "SYMPTOM",
                        "Score": 0.6819021701812744
                    }
                ]
            },
            {
                "Id": 4,
                "BeginOffset": 73,
                "EndOffset": 81,
                "Score": 0.9905840158462524,
                "Text": "diabetes",
                "Category": "MEDICAL_CONDITION",
                "Type": "DX_NAME",
                "Traits": [
                    {
                        "Name": "DIAGNOSIS",
                        "Score": 0.9255214333534241
                    }
                ]
            },
            {
                "Id": 1,
                "BeginOffset": 95,
                "EndOffset": 104,
                "Score": 0.6371926665306091,
                "Text": "Micronase",
                "Category": "MEDICATION",
                "Type": "BRAND_NAME",
                "Traits": [],
                "Attributes": [
                    {
                        "Type": "FREQUENCY",
                        "Score": 0.9761165380477905,
                        "RelationshipScore": 0.9984188079833984,
                        "RelationshipType": "FREQUENCY",
                        "Id": 2,
                        "BeginOffset": 105,
                        "EndOffset": 110,
                        "Text": "daily",
                        "Category": "MEDICATION",
                        "Traits": []
                    }
                ]
            }
        ],
        "UnmappedAttributes": [],
        "ModelVersion": "1.0.0"
    }

For more information, see `InferSNOMEDCT <https://docs.aws.amazon.com/comprehend-medical/latest/dev/ontology-linking-snomed.html>`__ in the *Amazon Comprehend Medical Developer Guide*.