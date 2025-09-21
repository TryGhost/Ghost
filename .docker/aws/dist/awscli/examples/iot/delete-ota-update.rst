**To delete an OTA update**

The following ``delete-ota-update`` example deletes the specified OTA update. ::

    aws iot delete-ota-update \
        --ota-update-id ota12345 \
        --delete-stream \
        --force-delete-aws-job

This command produces no output.

For more information, see `DeleteOTAUpdate <https://docs.aws.amazon.com/iot/latest/apireference/API_DeleteOTAUpdate.html>`__ in the *AWS IoT API Reference*.
