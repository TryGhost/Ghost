**Example 1: Create a SigV4-enabled HealthLake data store**

The following ``create-fhir-datastore`` example demonstrates how to create a new data store in AWS HealthLake. ::

    aws healthlake create-fhir-datastore \
        --datastore-type-version R4 \
        --datastore-name "FhirTestDatastore"

Output::

    {
        "DatastoreEndpoint": "https://healthlake.us-east-1.amazonaws.com/datastore/(Data store ID)/r4/",
        "DatastoreArn": "arn:aws:healthlake:us-east-1:(AWS Account ID):datastore/(Data store ID)",
        "DatastoreStatus": "CREATING",
        "DatastoreId": "(Data store ID)"
    }

**Example 2: Create a SMART on FHIR-enabled HealthLake data store**

The following ``create-fhir-datastore`` example demonstrates how to create a new SMART on FHIR-enabled data store in AWS HealthLake. ::

    aws healthlake create-fhir-datastore \
        --datastore-name "your-data-store-name" \
        --datastore-type-version R4 \
        --preload-data-config PreloadDataType="SYNTHEA" \
        --sse-configuration '{ "KmsEncryptionConfig": {  "CmkType": "CUSTOMER_MANAGED_KMS_KEY", "KmsKeyId": "arn:aws:kms:us-east-1:your-account-id:key/your-key-id" } }' \
        --identity-provider-configuration  file://identity_provider_configuration.json

Contents of ``identity_provider_configuration.json``::

    {
        "AuthorizationStrategy": "SMART_ON_FHIR_V1",
        "FineGrainedAuthorizationEnabled": true,
        "IdpLambdaArn": "arn:aws:lambda:your-region:your-account-id:function:your-lambda-name",
        "Metadata": "{\"issuer\":\"https://ehr.example.com\", \"jwks_uri\":\"https://ehr.example.com/.well-known/jwks.json\",\"authorization_endpoint\":\"https://ehr.example.com/auth/authorize\",\"token_endpoint\":\"https://ehr.token.com/auth/token\",\"token_endpoint_auth_methods_supported\":[\"client_secret_basic\",\"foo\"],\"grant_types_supported\":[\"client_credential\",\"foo\"],\"registration_endpoint\":\"https://ehr.example.com/auth/register\",\"scopes_supported\":[\"openId\",\"profile\",\"launch\"],\"response_types_supported\":[\"code\"],\"management_endpoint\":\"https://ehr.example.com/user/manage\",\"introspection_endpoint\":\"https://ehr.example.com/user/introspect\",\"revocation_endpoint\":\"https://ehr.example.com/user/revoke\",\"code_challenge_methods_supported\":[\"S256\"],\"capabilities\":[\"launch-ehr\",\"sso-openid-connect\",\"client-public\"]}"
    }

Output::

    {
        "DatastoreEndpoint": "https://healthlake.us-east-1.amazonaws.com/datastore/(Data store ID)/r4/",
        "DatastoreArn": "arn:aws:healthlake:us-east-1:(AWS Account ID):datastore/(Data store ID)",
        "DatastoreStatus": "CREATING",
        "DatastoreId": "(Data store ID)"
    }

For more information, see `Creating and monitoring a FHIR data store <https://docs.aws.amazon.com/healthlake/latest/devguide/working-with-FHIR-healthlake.html>`__ in the *AWS HealthLake Developer Guide*.
