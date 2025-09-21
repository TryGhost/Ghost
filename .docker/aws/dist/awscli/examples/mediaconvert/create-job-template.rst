**To create a job template**

The following ``create-job-template`` example creates a job template with the transcoding settings that are specified in the file ``job-template.json`` that resides on your system. ::

    aws mediaconvert create-job-template \
        --endpoint-url https://abcd1234.mediaconvert.region-name-1.amazonaws.com \
        --region region-name-1 \
        --name JobTemplate1 \
        --cli-input-json file://~/job-template.json

If you create your job template JSON file by using ``get-job-template`` and then modifying the file, remove the ``JobTemplate`` object, but keep the `Settings` child object inside it. Also, make sure to remove the following key-value pairs: ``LastUpdated``, ``Arn``, ``Type``, and ``CreatedAt``. You can specific the category, description, name, and queue either in the JSON file or at the command line.

To get your account-specific endpoint, use ``describe-endpoints``, or send the command without the endpoint. The service returns an error and your endpoint.

If your request is successful, the service returns the JSON specification for the job template that you created.

For more information, see `Working with AWS Elemental MediaConvert Job Templates <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-job-templates.html>`_ in the *AWS Elemental MediaConvert User Guide*.

