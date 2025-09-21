**Example 1: To generate a service access report for a custom policy**

The following ``generate-service-last-accessed-details`` example starts a background job to generate a report that lists the services accessed by IAM users and other entities with a custom policy named ``intern-boundary``. You can display the report after it is created by running the ``get-service-last-accessed-details`` command. ::

    aws iam generate-service-last-accessed-details \
        --arn arn:aws:iam::123456789012:policy/intern-boundary

Output::

    {
        "JobId": "2eb6c2b8-7b4c-3xmp-3c13-03b72c8cdfdc"
    }

**Example 2: To generate a service access report for the AWS managed AdministratorAccess policy**

The following ``generate-service-last-accessed-details`` example starts a background job to generate a report that lists the services accessed by IAM users and other entities with the AWS managed ``AdministratorAccess`` policy. You can display the report after it is created by running the ``get-service-last-accessed-details`` command. ::

    aws iam generate-service-last-accessed-details \
        --arn arn:aws:iam::aws:policy/AdministratorAccess

Output::

    {
        "JobId": "78b6c2ba-d09e-6xmp-7039-ecde30b26916"
    }

For more information, see `Refining permissions in AWS using last accessed information <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_access-advisor.html>`__ in the *AWS IAM User Guide*.