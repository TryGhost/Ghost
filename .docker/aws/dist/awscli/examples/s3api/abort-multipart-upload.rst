**To abort the specified multipart upload**

The following ``abort-multipart-upload`` command aborts a multipart upload for the key ``multipart/01`` in the bucket ``amzn-s3-demo-bucket``. ::

    aws s3api abort-multipart-upload \
        --bucket amzn-s3-demo-bucket \
        --key multipart/01 \
        --upload-id dfRtDYU0WWCCcH43C3WFbkRONycyCpTJJvxu2i5GYkZljF.Yxwh6XG7WfS2vC4to6HiV6Yjlx.cph0gtNBtJ8P3URCSbB7rjxI5iEwVDmgaXZOGgkk5nVTW16HOQ5l0R

The upload ID required by this command is output by ``create-multipart-upload`` and can also be retrieved with ``list-multipart-uploads``.