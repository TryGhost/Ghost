**To create a case**

The following ``create-case`` example creates a support case for your AWS account. ::

    aws support create-case \
        --category-code "using-aws" \
        --cc-email-addresses "myemail@example.com" \ 
        --communication-body "I want to learn more about an AWS service." \
        --issue-type "technical" \
        --language "en" \
        --service-code "general-info" \
        --severity-code "low" \
        --subject "Question about my account" 

Output::

    {
        "caseId": "case-12345678910-2013-c4c1d2bf33c5cf47"
    }

For more information, see `Case management <https://docs.aws.amazon.com/awssupport/latest/user/case-management.html>`__ in the *AWS Support User Guide*.