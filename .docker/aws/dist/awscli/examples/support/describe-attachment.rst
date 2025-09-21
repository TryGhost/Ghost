**To describe an attachment**

The following ``describe-attachment`` example returns information about the attachment with the specified ID. ::

    aws support describe-attachment \
        --attachment-id "attachment-KBnjRNrePd9D6Jx0-Mm00xZuDEaL2JAj_0-gJv9qqDooTipsz3V1Nb19rCfkZneeQeDPgp8X1iVJyHH7UuhZDdNeqGoduZsPrAhyMakqlc60-iJjL5HqyYGiT1FG8EXAMPLE"

Output::

    {
        "attachment": {
            "fileName": "troubleshoot-screenshot.png",
            "data": "base64-blob"
        }
    }

For more information, see `Case management <https://docs.aws.amazon.com/awssupport/latest/user/case-management.html>`__ in the *AWS Support User Guide*.