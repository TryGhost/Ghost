**To delete a job template**

The following ``delete-job-template`` example deletes the specified custom job template. ::

    aws mediaconvert delete-job-template \
        --name "DASH Streaming" \
        --endpoint-url https://abcd1234.mediaconvert.us-west-2.amazonaws.com

This command produces no output. Run ``aws mediaconvert list-job-templates`` to confirm that your template was deleted.


For more information, see `Working with AWS Elemental MediaConvert Job Templates <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-job-templates.html>`__ in the *AWS Elemental MediaConvert User Guide*.
