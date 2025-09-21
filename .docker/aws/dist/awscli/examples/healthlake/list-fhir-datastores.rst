**To list FHIR data stores**

The following ``list-fhir-datastores`` example shows to how to use the command and how users can filter results based on data store status in AWS HealthLake. ::

    aws healthlake list-fhir-datastores \
        --filter DatastoreStatus=ACTIVE

Output::

    {
        "DatastorePropertiesList": [
        {
            "PreloadDataConfig": {
                "PreloadDataType": "SYNTHEA"
            },
            "SseConfiguration": {
                "KmsEncryptionConfig": {
                    "CmkType": "CUSTOMER_MANAGED_KMS_KEY",
                    "KmsKeyId": "arn:aws:kms:us-east-1:123456789012:key/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
                }
            },
            "DatastoreName": "Demo",
            "DatastoreArn": "arn:aws:healthlake:us-east-1:<AWS Account ID>:datastore/<Data store ID>",
            "DatastoreEndpoint": "https://healthlake.us-east-1.amazonaws.com/datastore/<Data store ID>/r4/",
            "DatastoreStatus": "ACTIVE",
            "DatastoreTypeVersion": "R4",
            "CreatedAt": 1603761064.881,
            "DatastoreId": "<Data store ID>",
            "IdentityProviderConfiguration": {
                "AuthorizationStrategy": "AWS_AUTH",
                "FineGrainedAuthorizationEnabled": false
            }
        }
        ]
    }

For more information, see `Creating and monitoring a FHIR data store <https://docs.aws.amazon.com/healthlake/latest/devguide/working-with-FHIR-healthlake.html>`__ in the *AWS HealthLake Developer Guide*.
