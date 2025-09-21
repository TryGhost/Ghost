**To add communication to a case**

The following ``add-communication-to-case`` example adds communications to a support case in your AWS account. ::

    aws support add-communication-to-case \
        --case-id "case-12345678910-2013-c4c1d2bf33c5cf47" \
        --communication-body "I'm attaching a set of images to this case." \
        --cc-email-addresses "myemail@example.com" \
        --attachment-set-id "as-2f5a6faa2a4a1e600-mu-nk5xQlBr70-G1cUos5LZkd38KOAHZa9BMDVzNEXAMPLE"

Output::

    {
        "result": true
    }

For more information, see `Case management <https://docs.aws.amazon.com/awssupport/latest/user/case-management.html>`__ in the *AWS Support User Guide*.