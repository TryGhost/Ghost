**To retrieve information about a job**

The following ``get-job`` example retrieves information about a job. ::

    aws glue get-job \
        --job-name my-testing-job 

Output::

    {
        "Job": {
            "Name": "my-testing-job",
            "Role": "Glue_DefaultRole",
            "CreatedOn": 1602805698.167,
            "LastModifiedOn": 1602805698.167,
            "ExecutionProperty": {
                "MaxConcurrentRuns": 1
            },
            "Command": {
                "Name": "gluestreaming",
                "ScriptLocation": "s3://janetst-bucket-01/Scripts/test_script.scala",
                "PythonVersion": "2"
            },
            "DefaultArguments": {
                "--class": "GlueApp",
                "--job-language": "scala"
            },
            "MaxRetries": 0,
            "AllocatedCapacity": 10,
            "MaxCapacity": 10.0,
            "GlueVersion": "1.0"
        }
    }

For more information, see `Jobs <https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-jobs-job.html>`__ in the *AWS Glue Developer Guide*.
