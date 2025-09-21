**To delete a detector model**

The following ``delete-detector-model`` example deletes the specified detector model. Any active instances of the detector model are also deleted. ::

    aws iotevents delete-detector-model \
        --detector-model-name motorDetectorModel

This command produces no output.

For more information, see `DeleteDetectorModel <https://docs.aws.amazon.com/iotevents/latest/apireference/API_DeleteDetectorModel>`__ in the *AWS IoT Events API Reference*.
