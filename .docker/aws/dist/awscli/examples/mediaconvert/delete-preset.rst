**To delete a custom on-demand queue**

The following ``delete-preset`` example deletes the specified custom preset. ::

    aws mediaconvert delete-preset \
        --name SimpleMP4 \
        --endpoint-url  https://abcd1234.mediaconvert.us-west-2.amazonaws.com

This command produces no output. Run ``aws mediaconvert list-presets`` to confirm that your preset was deleted.

For more information, see `Working with AWS Elemental MediaConvert Output Presets <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-presets.html>`__ in the *AWS Elemental MediaConvert User Guide*.
