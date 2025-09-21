**To generate a random password**

The following ``get-random-password`` example generates a random password 20 characters long that includes at least one uppercase letter, lowercase letter, number, and punctuation. ::

    aws secretsmanager get-random-password \
        --require-each-included-type \
        --password-length 20

Output::

    {
        "RandomPassword": "EXAMPLE-PASSWORD"
    }

For more information, see `Create and manage secrets <https://docs.aws.amazon.com/secretsmanager/latest/userguide/managing-secrets.html>`__ in the *Secrets Manager User Guide*.