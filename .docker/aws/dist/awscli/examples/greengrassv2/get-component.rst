**Example 1: To download a component's recipe in YAML format (Linux, macOS, or Unix)**

The following ``get-component`` example downloads a Hello World component's recipe to a file in YAML format. This command does the following:

#. Uses the ``--output`` and ``--query`` parameters to control the command's output. These parameters extract the recipe blob from the command's output. For more information about controlling output, see `Controlling Command Output <https://docs.aws.amazon.com/cli/latest/userguide/controlling-output.html>`_ in the *AWS Command Line Interface User Guide*.

#. Uses the ``base64`` utility. This utility decodes the extracted blob to the original text. The blob that is returned by a successful ``get-component`` command is base64-encoded text. You must decode this blob to obtain the original text.

#. Saves the decoded text to a file. The final section of the command (``> com.example.HelloWorld-1.0.0.json``) saves the decoded text to a file.

::

    aws greengrassv2 get-component \
        --arn arn:aws:greengrass:us-west-2:123456789012:components:com.example.HelloWorld:versions:1.0.0 \
        --recipe-output-format YAML \
        --query recipe \
        --output text | base64 --decode > com.example.HelloWorld-1.0.0.json

For more information, see `Manage components <https://docs.aws.amazon.com/greengrass/v2/developerguide/manage-components.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.

**Example 2: To download a component's recipe in YAML format (Windows CMD)**

The following ``get-component`` example downloads a Hello World component's recipe to a file in YAML format. This command uses the ``certutil`` utility. ::

    aws greengrassv2 get-component ^
        --arn arn:aws:greengrass:us-west-2:675946970638:components:com.example.HelloWorld:versions:1.0.0 ^
        --recipe-output-format YAML ^
        --query recipe ^
        --output text > com.example.HelloWorld-1.0.0.yaml.b64

    certutil -decode com.example.HelloWorld-1.0.0.yaml.b64 com.example.HelloWorld-1.0.0.yaml

For more information, see `Manage components <https://docs.aws.amazon.com/greengrass/v2/developerguide/manage-components.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.

**Example 3: To download a component's recipe in YAML format (Windows PowerShell)**

The following ``get-component`` example downloads a Hello World component's recipe to a file in YAML format. This command uses the ``certutil`` utility. ::

    aws greengrassv2 get-component `
        --arn arn:aws:greengrass:us-west-2:675946970638:components:com.example.HelloWorld:versions:1.0.0 `
        --recipe-output-format YAML `
        --query recipe `
        --output text > com.example.HelloWorld-1.0.0.yaml.b64

    certutil -decode com.example.HelloWorld-1.0.0.yaml.b64 com.example.HelloWorld-1.0.0.yaml

For more information, see `Manage components <https://docs.aws.amazon.com/greengrass/v2/developerguide/manage-components.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.