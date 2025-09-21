**To retrieve a service access report**

The following ``get-service-last-accessed-details`` example retrieves a previously generated report that lists the services accessed by IAM entities. To generate a report, use the ``generate-service-last-accessed-details`` command. ::

    aws iam get-service-last-accessed-details \
        --job-id 2eb6c2b8-7b4c-3xmp-3c13-03b72c8cdfdc

Output::

    {
        "JobStatus": "COMPLETED",
        "JobCreationDate": "2019-10-01T03:50:35.929Z",
        "ServicesLastAccessed": [
            ...
            {
                "ServiceName": "AWS Lambda",
                "LastAuthenticated": "2019-09-30T23:02:00Z",
                "ServiceNamespace": "lambda",
                "LastAuthenticatedEntity": "arn:aws:iam::123456789012:user/admin",
                "TotalAuthenticatedEntities": 6
            },
        ]
    }

For more information, see `Refining permissions in AWS using last accessed information <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_access-advisor.html>`__ in the *AWS IAM User Guide*.