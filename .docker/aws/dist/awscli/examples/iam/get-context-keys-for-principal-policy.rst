**To list the context keys referenced by all policies associated with an IAM principal**

The following ``get-context-keys-for-principal-policy`` command retrieves all policies that are attached to the user ``saanvi`` and any groups she is a member of. It then parses each and lists the context keys used by those policies. Use this command to identify which context key values you must supply to successfully use the ``simulate-custom-policy`` and ``simulate-principal-policy`` commands. You can also retrieve the list of context keys used by an arbitrary JSON policy by using the ``get-context-keys-for-custom-policy`` command. ::

     aws iam get-context-keys-for-principal-policy \
        --policy-source-arn arn:aws:iam::123456789012:user/saanvi

Output::

    {
        "ContextKeyNames": [
            "aws:username",
            "aws:CurrentTime"
        ]
    }

For more information, see `Using the IAM Policy Simulator (AWS CLI and AWS API) <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_testing-policies.html#policies-simulator-using-api>`__ in the *AWS IAM User Guide*.