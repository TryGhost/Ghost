**To get information about an Amazon Kendra index**

The following ``describe-index`` gets information about an Amazon Kendra index. You can view the configuration of an index, and read any error messages if the status shows an index "FAILED" to completely create. ::

    aws kendra describe-index \
        --id exampleindex1

Output::

    {
        "CapacityUnits": { 
            "QueryCapacityUnits": 0,
            "StorageCapacityUnits": 0
        },
        "CreatedAt": 2024-02-25T12:30:10+00:00,
        "Description": "Example index 1 contains the first set of example documents",
        "DocumentMetadataConfigurations": [
            {
                "Name": "_document_title",
                "Relevance": {
                    "Importance": 8
                },
                "Search": {
                    "Displayable": true,
                    "Facetable": false,
                    "Searchable": true,
                    "Sortable": false
                },
                "Type": "STRING_VALUE"
            },
            {
                "Name": "_document_body",
                "Relevance": {
                    "Importance": 5
                },
                "Search": {
                    "Displayable": true,
                    "Facetable": false,
                    "Searchable": true,
                    "Sortable": false
                },
                "Type": "STRING_VALUE"
            },
            {
                "Name": "_last_updated_at",
                "Relevance": {
                    "Importance": 6,
                    "Duration": "2628000s",
                    "Freshness": true
                },
                "Search": {
                    "Displayable": true,
                    "Facetable": false,
                    "Searchable": true,
                    "Sortable": true
                },
                "Type": "DATE_VALUE"
            },
            {
                "Name": "department_custom_field",
                "Relevance": {
                    "Importance": 7,
                    "ValueImportanceMap": {
                        "Human Resources" : 4,
                        "Marketing and Sales" : 2,
                        "Research and innvoation" : 3,
                        "Admin" : 1
                    }
                },
                "Search": {
                    "Displayable": true,
                    "Facetable": true,
                    "Searchable": true,
                    "Sortable": true
                },
                "Type": "STRING_VALUE"
            }
        ],
        "Edition": "DEVELOPER_EDITION",
        "Id": "index1",
        "IndexStatistics": {
            "FaqStatistics": {
                "IndexedQuestionAnswersCount": 10
            },
            "TextDocumentStatistics": {
                "IndexedTextBytes": 1073741824,
                "IndexedTextDocumentsCount": 1200
            }
        },
        "Name": "example index 1",
        "RoleArn": "arn:aws:iam::my-account-id:role/KendraRoleForExampleIndex",
        "ServerSideEncryptionConfiguration": {
            "KmsKeyId": "my-kms-key-id"
        },
        "Status": "ACTIVE",
        "UpdatedAt": 1709163615,
        "UserContextPolicy": "USER_TOKEN",
        "UserTokenConfigurations": [
            {
                "JsonTokenTypeConfiguration": {
                    "GroupAttributeField": "groupNameField",
                    "UserNameAttributeField": "userNameField"
                }
            }
        ]
    }

For more information, see `Getting started with an Amazon Kendra index and data source connector <https://docs.aws.amazon.com/kendra/latest/dg/getting-started.html>`__ in the *Amazon Kendra Developer Guide*.