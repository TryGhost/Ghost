**To create a job**

The following ``create-job`` example creates a transcoding job with the settings that are specified in a file ``job.json`` that resides on the system that you send the command from. This JSON job specification might specify each setting individually, reference a job template, or reference output presets. ::

    aws mediaconvert create-job \
        --endpoint-url https://abcd1234.mediaconvert.region-name-1.amazonaws.com \
        --region region-name-1 \
        --cli-input-json file://~/job.json

You can use the AWS Elemental MediaConvert console to generate the JSON job specification by choosing your job settings, and then choosing **Show job JSON** at the bottom of the **Job** section. 

To get your account-specific endpoint, use ``describe-endpoints``, or send the command without the endpoint. The service returns an error and your endpoint.

If your request is successful, the service returns the JSON job specification that you sent with your request.

For more information, see `Working with AWS Elemental MediaConvert Jobs <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-jobs.html>`_ in the *AWS Elemental MediaConvert User Guide*.
