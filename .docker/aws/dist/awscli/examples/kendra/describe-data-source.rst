**To get information about an Amazon Kendra data source connector**

The following ``describe-data-source`` gets information about an Amazon Kendra data soource connector. You can view the configuration of a data source connector, and read any error messages if the status shows a data source connector "FAILED" to completely create. ::

    aws kendra describe-data-source \
        --id exampledatasource1 \
        --index-id exampleindex1

Output::

    {
        "Configuration": {
            "TemplateConfiguration": {
                "Template": {
                    "connectionConfiguration": {
                        "repositoryEndpointMetadata": {
                            "BucketName": "amzn-s3-demo-bucket"
                        }
                    },
                    "repositoryConfigurations": {
                        "document":{
                            "fieldMappings": [
                                {
                                    "indexFieldName":"_document_title",
                                    "indexFieldType":"STRING",
                                    "dataSourceFieldName": "title"
                                },
                                {
                                    "indexFieldName":"_last_updated_at",
                                    "indexFieldType":"DATE",
                                    "dataSourceFieldName": "modified_date"
                                }
                            ]
                        }
                    },
                    "additionalProperties": {
                        "inclusionPatterns": [
                            "*.txt",
                            "*.doc",
                            "*.docx"
                        ],
                        "exclusionPatterns": [
                            "*.json"
                        ],
                        "inclusionPrefixes": [
                            "PublicExampleDocsFolder"
                        ],
                        "exclusionPrefixes": [
                            "PrivateDocsFolder/private"
                        ],
                        "aclConfigurationFilePath": "ExampleDocsFolder/AclConfig.json",
                        "metadataFilesPrefix": "metadata"
                    },
                    "syncMode": "FULL_CRAWL",
                    "type" : "S3",
                    "version": "1.0.0"
                }
            }
        },
        "CreatedAt": 2024-02-25T13:30:10+00:00,
        "CustomDocumentEnrichmentConfiguration": {
            "PostExtractionHookConfiguration": {
                "LambdaArn": "arn:aws:iam::my-account-id:function/my-function-ocr-docs",
                "S3Bucket": "s3://amzn-s3-demo-bucket/scanned-image-text-example-docs/function"
            },
            "RoleArn": "arn:aws:iam:my-account-id:role/KendraRoleForCDE"
        }
        "Description": "Example data source 1 for example index 1 contains the first set of example documents",
        "Id": exampledatasource1,
        "IndexId": exampleindex1,
        "LanguageCode": "en",
        "Name": "example data source 1",
        "RoleArn": "arn:aws:iam::my-account-id:role/KendraRoleForS3TemplateConfigDataSource",
        "Schedule": "0 0 18 ? * TUE,MON,WED,THU,FRI,SAT *",
        "Status": "ACTIVE",
        "Type": "TEMPLATE",
        "UpdatedAt": 1709163615,
        "VpcConfiguration": {
            "SecurityGroupIds": ["sg-1234567890abcdef0"],
            "SubnetIds": ["subnet-1c234","subnet-2b134"]
        }
    }

For more information, see `Getting started with an Amazon Kendra index and data source connector <https://docs.aws.amazon.com/kendra/latest/dg/getting-started.html>`__ in the *Amazon Kendra Developer Guide*.