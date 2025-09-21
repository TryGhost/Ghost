**Example: To associate an AWS account with an Amazon Inspector delegated administrator**

The following ``associate-member`` example associates an AWS account with an Amazon Inspector delegated administrator. ::

    aws inspector2 associate-member \
        --account-id 123456789012

Output::

    {
        "accountId": "123456789012"
    }

For more information, see `Managing multiple accounts in Amazon Inspector with AWS Organizations <https://docs.aws.amazon.com/inspector/latest/user/managing-multiple-accounts.html>`__ in the *Amazon Inspector User Guide*.
