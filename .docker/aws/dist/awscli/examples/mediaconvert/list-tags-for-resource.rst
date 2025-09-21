**To list the tags on a MediaConvert queue, job template, or output preset**

The following ``list-tags-for-resource`` example lists the tags on the specified output preset. ::

    aws mediaconvert list-tags-for-resource \
        --arn arn:aws:mediaconvert:us-west-2:123456789012:presets/SimpleMP4 \
        --endpoint-url https://abcd1234.mediaconvert.us-west-2.amazonaws.com

Output::

    {
        "ResourceTags": {
            "Tags": {
                "customer": "zippyVideo"
            },
            "Arn": "arn:aws:mediaconvert:us-west-2:123456789012:presets/SimpleMP4"
        }
    }

For more information, see `Tagging AWS Elemental MediaConvert Queues, Job Templates, and Output Presets <https://docs.aws.amazon.com/mediaconvert/latest/ug/tagging-queues-templates-presets.html>`__ in the *AWS Elemental MediaConvert User Guide*.
