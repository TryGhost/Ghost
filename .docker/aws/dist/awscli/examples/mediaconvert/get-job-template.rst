**To get details for a job template**

The following ``get-job-template`` example displays the JSON definition of the specified custom job template. ::

    aws mediaconvert get-job-template \
        --name "DASH Streaming" \
        --endpoint-url https://abcd1234.mediaconvert.us-east-1.amazonaws.com

Output::

    {
        "JobTemplate": {
            "StatusUpdateInterval": "SECONDS_60",
            "LastUpdated": 1568652998,
            "Description": "Create a DASH streaming ABR stack",
            "CreatedAt": 1568652998,
            "Priority": 0,
            "Name": "DASH Streaming",
            "Settings": {
                ...<truncatedforbrevity>...
            },
            "Arn": "arn:aws:mediaconvert:us-west-2:123456789012:jobTemplates/DASH Streaming",
            "Type": "CUSTOM"
        }
    }

For more information, see `Working with AWS Elemental MediaConvert Job Templates <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-job-templates.html>`__ in the *AWS Elemental MediaConvert User Guide*.
