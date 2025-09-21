**Example 1: To create a secret from credentials in a JSON file**

The following ``create-secret`` example creates a secret from credentials in a file. For more information, see `Loading AWS CLI parameters from a file <https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-parameters-file.html>`__ in the *AWS CLI User Guide*. ::

    aws secretsmanager create-secret \
        --name MyTestSecret \
        --secret-string file://mycreds.json 

Contents of ``mycreds.json``::

    {
      "engine": "mysql",
      "username": "saanvis",
      "password": "EXAMPLE-PASSWORD",
      "host": "my-database-endpoint.us-west-2.rds.amazonaws.com",
      "dbname": "myDatabase",
      "port": "3306"
    }

Output::

    {
      "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
      "Name": "MyTestSecret",
      "VersionId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
    }

For more information, see `Create a secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_create-basic-secret.html>`__ in the *Secrets Manager User Guide*.

**Example 2: To create a secret**

The following ``create-secret`` example creates a secret with two key-value pairs. When you enter commands in a command shell, there is a risk of the command history being accessed or utilities having access to your command parameters. This is a concern if the command includes the value of a secret. For more information, see `Mitigate the risks of using command-line tools to store secrets <https://docs.aws.amazon.com/secretsmanager/latest/userguide/security_cli-exposure-risks.html>`__ in the *Secrets Manager User Guide*. ::

    aws secretsmanager create-secret \
        --name MyTestSecret \
        --description "My test secret created with the CLI." \
        --secret-string "{\"user\":\"diegor\",\"password\":\"EXAMPLE-PASSWORD\"}" 

Output::

    {
      "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
      "Name": "MyTestSecret",
      "VersionId": "EXAMPLE1-90ab-cdef-fedc-ba987EXAMPLE"
    }

For more information, see `Create a secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_create-basic-secret.html>`__ in the *Secrets Manager User Guide*.