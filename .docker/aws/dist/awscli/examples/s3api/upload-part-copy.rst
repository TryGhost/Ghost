**To upload part of an object by copying data from an existing object as the data source**

The following ``upload-part-copy`` example uploads a part by copying data from an existing object as a data source. ::

    aws s3api upload-part-copy \
        --bucket amzn-s3-demo-bucket \
        --key "Map_Data_June.mp4" \
        --copy-source "amzn-s3-demo-bucket/copy_of_Map_Data_June.mp4" \
        --part-number 1 \
        --upload-id "bq0tdE1CDpWQYRPLHuNG50xAT6pA5D.m_RiBy0ggOH6b13pVRY7QjvLlf75iFdJqp_2wztk5hvpUM2SesXgrzbehG5hViyktrfANpAD0NO.Nk3XREBqvGeZF6U3ipiSm"

Output::

    {
        "CopyPartResult": {
            "LastModified": "2019-12-13T23:16:03.000Z",
            "ETag": "\"711470fc377698c393d94aed6305e245\""
        }
    }
