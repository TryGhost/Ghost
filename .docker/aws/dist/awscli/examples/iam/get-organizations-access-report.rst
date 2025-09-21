**To retrieve an access report**

The following ``get-organizations-access-report`` example displays a previously generated access report for an AWS Organizations entity. To generate a report, use the ``generate-organizations-access-report`` command. ::

    aws iam get-organizations-access-report \
        --job-id a8b6c06f-aaa4-8xmp-28bc-81da71836359

Output::

    {
        "JobStatus": "COMPLETED",
        "JobCreationDate": "2019-09-30T06:53:36.187Z",
        "JobCompletionDate": "2019-09-30T06:53:37.547Z",
        "NumberOfServicesAccessible": 188,
        "NumberOfServicesNotAccessed": 171,
        "AccessDetails": [
            {
                "ServiceName": "Alexa for Business",
                "ServiceNamespace": "a4b",
                "TotalAuthenticatedEntities": 0
            },
            ...
    }

For more information, see `Refining permissions in AWS using last accessed information <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_access-advisor.html>`__ in the *AWS IAM User Guide*.