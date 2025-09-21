**To create a domain entry (DNS record)**

The following ``create-domain-entry`` example creates a DNS record (A) for the apex of the specified domain that points to an instance's IP address. 

**Note:** Lightsail's domain-related API operations are available in only the ``us-east-1`` Region. If your CLI profile is configured to use a different Region, you must include the ``--region us-east-1`` parameter or the command fails. ::

    aws lightsail create-domain-entry \
        --region us-east-1 \
        --domain-name example.com \
        --domain-entry name=example.com,type=A,target=192.0.2.0

Output::

    {
        "operation": {
            "id": "5be4494d-56f4-41fc-8730-693dcd0ef9e2",
            "resourceName": "example.com",
            "resourceType": "Domain",
            "createdAt": 1569865296.519,
            "location": {
                "availabilityZone": "all",
                "regionName": "global"
            },
            "isTerminal": true,
            "operationType": "CreateDomainEntry",
            "status": "Succeeded",
            "statusChangedAt": 1569865296.519
        }
    }

For more information, see `DNS in Amazon Lightsail <https://lightsail.aws.amazon.com/ls/docs/en_us/articles/understanding-dns-in-amazon-lightsail>`__ and `Creating a DNS zone to manage your domain's DNS records in Amazon Lightsail <https://lightsail.aws.amazon.com/ls/docs/en_us/articles/lightsail-how-to-create-dns-entry>`__ in the *Lightsail Developer Guide*.
