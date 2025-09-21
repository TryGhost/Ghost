**To update a recommendation lifecycle**

The following ``update-recommendation-lifecycle`` example updates the lifecycle of a recommendation by its identifier. ::

    aws trustedadvisor update-recommendation-lifecycle \
        --recommendation-identifier arn:aws:trustedadvisor::000000000000:recommendation/861c9c6e-f169-405a-8b59-537a8caccd7a \
        --lifecycle-stage resolved \
        --update-reason-code valid_business_case

This command produces no output.

For more information, see `Get started with the Trusted Advisor API <https://docs.aws.amazon.com/awssupport/latest/user/get-started-with-aws-trusted-advisor-api.html>`__ in the *AWS Trusted Advisor User Guide*.