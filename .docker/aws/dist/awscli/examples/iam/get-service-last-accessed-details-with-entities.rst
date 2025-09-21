**To retrieve a service access report with details for a service**

The following ``get-service-last-accessed-details-with-entities`` example retrieves a report that contains details about IAM users and other entities that accessed the specified service. To generate a report, use the ``generate-service-last-accessed-details`` command. To get a list of services accessed with namespaces, use ``get-service-last-accessed-details``. ::

    aws iam get-service-last-accessed-details-with-entities \
        --job-id 78b6c2ba-d09e-6xmp-7039-ecde30b26916 \
        --service-namespace lambda

Output::

    {
        "JobStatus": "COMPLETED",
        "JobCreationDate": "2019-10-01T03:55:41.756Z",
        "JobCompletionDate": "2019-10-01T03:55:42.533Z",
        "EntityDetailsList": [
            {
                "EntityInfo": {
                    "Arn": "arn:aws:iam::123456789012:user/admin",
                    "Name": "admin",
                    "Type": "USER",
                    "Id": "AIDAIO2XMPLENQEXAMPLE",
                    "Path": "/"
                },
                "LastAuthenticated": "2019-09-30T23:02:00Z"
            },
            {
                "EntityInfo": {
                    "Arn": "arn:aws:iam::123456789012:user/developer",
                    "Name": "developer",
                    "Type": "USER",
                    "Id": "AIDAIBEYXMPL2YEXAMPLE",
                    "Path": "/"
                },
                "LastAuthenticated": "2019-09-16T19:34:00Z"
            }
        ]
    }

For more information, see `Refining permissions in AWS using last accessed information <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_access-advisor.html>`__ in the *AWS IAM User Guide*.