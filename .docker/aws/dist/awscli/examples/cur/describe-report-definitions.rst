**To retrieve a list of AWS Cost and Usage Reports**

This example describes a list of AWS Cost and Usage Reports owned by an account.

Command::

  aws cur --region us-east-1 describe-report-definitions --max-items 5

Output::
	
	{
      "ReportDefinitions": [
        {
            "ReportName": "ExampleReport",
            "Compression": "ZIP",
            "S3Region": "us-east-1",
            "Format": "textORcsv",
            "S3Prefix": "exampleprefix",
            "S3Bucket": "example-s3-bucket",
            "TimeUnit": "DAILY",
            "AdditionalArtifacts": [
                "REDSHIFT",
                "QUICKSIGHT"
            ],
            "AdditionalSchemaElements": [
                "RESOURCES"
            ]
        }
      ]
	}
