**To update an ElasticTranscoder pipeline**

The following ``update-pipeline`` example updates the specified ElasticTranscoder pipeline. ::

    aws elastictranscoder update-pipeline \
        --id 1111111111111-abcde1 
        --name DefaultExample \
        --input-bucket salesoffice.example.com-source \
        --role arn:aws:iam::123456789012:role/Elastic_Transcoder_Default_Role \
        --notifications Progressing="",Completed="",Warning="",Error=arn:aws:sns:us-east-1:111222333444:ETS_Errors \
        --content-config file://content-config.json \
        --thumbnail-config file://thumbnail-config.json

Contents of ``content-config.json``::

    {
        "Bucket":"salesoffice.example.com-public-promos",
        "Permissions":[
            {
                "GranteeType":"Email",
                "Grantee":"marketing-promos@example.com",
                "Access":[
                    "FullControl"
                ]
            }
        ],
        "StorageClass":"Standard"
    }

Contents of ``thumbnail-config.json``::

    {
        "Bucket":"salesoffice.example.com-public-promos-thumbnails",
        "Permissions":[
            {
                "GranteeType":"Email",
                "Grantee":"marketing-promos@example.com",
                "Access":[
                    "FullControl"
                ]
            }
        ],
        "StorageClass":"ReducedRedundancy"
    }

Output::

    {
        "Pipeline": {
            "Status": "Active",
            "ContentConfig": {
                "Bucket": "ets-example",
                "StorageClass": "Standard",
                "Permissions": [
                    {
                        "Access": [
                            "FullControl"
                        ],
                        "Grantee": "marketing-promos@example.com",
                        "GranteeType": "Email"
                    }
                ]
            },
            "Name": "DefaultExample",
            "ThumbnailConfig": {
                "Bucket": "ets-example",
                "StorageClass": "ReducedRedundancy",
                "Permissions": [
                    {
                        "Access": [
                            "FullControl"
                        ],
                        "Grantee": "marketing-promos@example.com",
                        "GranteeType": "Email"
                    }
                ]
            },
            "Notifications": {
                "Completed": "",
                "Warning": "",
                "Progressing": "",
                "Error": "arn:aws:sns:us-east-1:111222333444:ETS_Errors"
            },
            "Role": "arn:aws:iam::123456789012:role/Elastic_Transcoder_Default_Role",
            "InputBucket": "ets-example",
            "Id": "3333333333333-abcde3",
            "Arn": "arn:aws:elastictranscoder:us-west-2:123456789012:pipeline/3333333333333-abcde3"
        },
        "Warnings": [
            {
                "Message": "The SNS notification topic for Error events and the pipeline are in different regions, which increases processing time for jobs in the pipeline and can incur additional charges. To decrease processing time and prevent cross-regional charges, use the same region for the SNS notification topic and the pipeline.",
                "Code": "6006"
            }
        ]
    }
