**To delete a FHIR data store**

The following ``delete-fhir-datastore`` example demonstrates how to delete a data store and all of its contents in AWS HealthLake. ::

    aws healthlake delete-fhir-datastore \
        --datastore-id (Data store ID)

Output::

    {
        "DatastoreEndpoint": "https://healthlake.us-east-1.amazonaws.com/datastore/(Data store ID)/r4/",
        "DatastoreArn": "arn:aws:healthlake:us-east-1:(AWS Account ID):datastore/(Data store ID)",
        "DatastoreStatus": "DELETING",
        "DatastoreId": "(Data store ID)"
    }

For more information, see `Creating and monitoring a FHIR data store <https://docs.aws.amazon.com/healthlake/latest/devguide/working-with-FHIR-healthlake.html>` in the *AWS HealthLake Developer Guide*.
