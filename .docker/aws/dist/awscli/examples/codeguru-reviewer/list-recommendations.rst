**To list the recommendations for a completed code review**

The following ``list-recommendations`` example lists the recommendations for a comleted code review. This code review has one recommendations. ::

    aws codeguru-reviewer list-recommendations \
        --code-review-arn arn:aws:codeguru-reviewer:us-west-2:544120495673:code-review:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "RecommendationSummaries": [
            {
                "Description": "\n\n**Problem**  \n You are using a `ConcurrentHashMap`, but your usage of `containsKey()` and `get()` may not be thread-safe at lines: **63 and 64**. In between the check and the `get()` another thread can remove the key and the `get()` will return `null`. The remove that can remove the key is at line: **59**.\n\n**Fix**  \n Consider calling `get()`, checking instead of your current check if the returned object is `null`, and then using that object only, without calling `get()` again.\n\n**More info**  \n [View an example on GitHub](https://github.com/apache/hadoop/blob/f16cf877e565084c66bc63605659b157c4394dc8/hadoop-tools/hadoop-aws/src/main/java/org/apache/hadoop/fs/s3a/s3guard/S3Guard.java#L302-L304) (external link).",
                "RecommendationId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "StartLine": 63,
                "EndLine": 64,
                "FilePath": "src/main/java/com/company/sample/application/CreateOrderThread.java"
            }
        ]
    }

For more information, see `Step 4: Provide feedback <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/provide-feedback.html>`__ in the *Amazon CodeGuru Reviewer User Guide*.
