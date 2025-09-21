**To change a preset**

The following ``update-preset`` example replaces the description for the specified preset.
 ::

    aws mediaconvert update-preset \
    --name Customer1 \
    --description "New description text."
    --endpoint-url https://abcd1234.mediaconvert.us-west-2.amazonaws.com

This command produces no output.
Output::

    {
        "Preset": {
            "Arn": "arn:aws:mediaconvert:us-east-1:003235472598:presets/SimpleMP4",
            "Settings": {
            ...<output settings removed for brevity>... 
            },
            "Type": "CUSTOM",
            "LastUpdated": 1568938411,
            "Description": "New description text.",
            "Name": "SimpleMP4",
            "CreatedAt": 1568938240
        }
    }

For more information, see `Working with AWS Elemental MediaConvert Output Presets <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-presets.html>`__ in the *AWS Elemental MediaConvert User Guide*.
