**To list all domains**

The following ``list-domain-names`` example provides a quick summary of all domains in the region. ::

    aws es list-domain-names

Output::

    {
        "DomainNames": [{
                "DomainName": "cli-example-1"
            },
            {
                "DomainName": "cli-example-2"
            }
        ]
    }

For more information, see `Creating and Managing Amazon Elasticsearch Service Domains <https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-createupdatedomains.html>`__ in the *Amazon Elasticsearch Service Developer Guide*.
