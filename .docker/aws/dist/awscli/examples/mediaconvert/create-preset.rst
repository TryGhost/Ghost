**To create a custom output preset**

The following ``create-preset`` example creates a custom output preset based on the output settings that are specified in the file ``preset.json``. You can specify the category, description, and name either in the JSON file or at the command line. ::

    aws mediaconvert create-preset \
        --endpoint-url https://abcd1234.mediaconvert.region-name-1.amazonaws.com 
        --region region-name-1 \
        --cli-input-json file://~/preset.json

If you create your preset JSON file by using ``get-preset`` and then modifying the output file, ensure that you remove the following key-value pairs: ``LastUpdated``, ``Arn``, ``Type``, and ``CreatedAt``.

To get your account-specific endpoint, use ``describe-endpoints``, or send the command without the endpoint. The service returns an error and your endpoint.

For more information, see `Working with AWS Elemental MediaConvert Output Presets <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-presets.html>`_ in the *AWS Elemental MediaConvert User Guide*.