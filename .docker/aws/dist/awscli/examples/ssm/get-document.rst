**To get document content**

The following ``get-document`` example displays the content of a Systems Manager document. ::

    aws ssm get-document \
        --name "AWS-RunShellScript"

Output::

    {
        "Name": "AWS-RunShellScript",
        "DocumentVersion": "1",
        "Status": "Active",
        "Content": "{\n    \"schemaVersion\":\"1.2\",\n    \"description\":\"Run a shell script or specify the commands to run.\",\n    \"parameters\":{\n        \"commands\":{\n            \"type\":\"StringList\",\n            \"description\":\"(Required) Specify a shell script or a command to run.\",\n            \"minItems\":1,\n            \"displayType\":\"textarea\"\n        },\n        \"workingDirectory\":{\n            \"type\":\"String\",\n            \"default\":\"\",\n            \"description\":\"(Optional) The path to the working directory on your instance.\",\n            \"maxChars\":4096\n        },\n        \"executionTimeout\":{\n            \"type\":\"String\",\n            \"default\":\"3600\",\n            \"description\":\"(Optional) The time in seconds for a command to complete before it is considered to have failed. Default is 3600 (1 hour). Maximum is 172800 (48 hours).\",\n            \"allowedPattern\":\"([1-9][0-9]{0,4})|(1[0-6][0-9]{4})|(17[0-1][0-9]{3})|(172[0-7][0-9]{2})|(172800)\"\n        }\n    },\n    \"runtimeConfig\":{\n        \"aws:runShellScript\":{\n            \"properties\":[\n                {\n                    \"id\":\"0.aws:runShellScript\",\n                    \"runCommand\":\"{{ commands }}\",\n                    \"workingDirectory\":\"{{ workingDirectory }}\",\n                    \"timeoutSeconds\":\"{{ executionTimeout }}\"\n                }\n            ]\n        }\n    }\n}\n",
        "DocumentType": "Command",
        "DocumentFormat": "JSON"
    }    

For more information, see `AWS Systems Manager Documents <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-ssm-docs.html>`__ in the *AWS Systems Manager User Guide*.
