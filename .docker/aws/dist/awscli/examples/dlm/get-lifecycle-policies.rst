**To get a summary of your lifecycle policies**

The following ``get-lifecycle-policies`` example lists all of your lifecycle policies. ::

    aws dlm get-lifecycle-policies

Output::

    {
        "Policies": [
            {
                "PolicyId": "policy-0123456789abcdef0",
                "Description": "My first policy",
                "State": "ENABLED"
            }
        ]
    }
