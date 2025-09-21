**To get a list of Docker images managed by AWS CodeBuild that you can use for your builds.**

The following ``list-curated-environment-images`` example lists the Docker images managed by CodeBuild that can be used for builds.::

    aws codebuild list-curated-environment-images
    
Output::

    {
        "platforms": [
            {
                "platform": "AMAZON_LINUX",
                "languages": [
                    {
                        "language": "JAVA",
                        "images": [
                            {
                                "description": "AWS ElasticBeanstalk - Java 7 Running on Amazon Linux 64bit v2.1.3",
                                "name": "aws/codebuild/eb-java-7-amazonlinux-64:2.1.3",
                                "versions": [
                                    "aws/codebuild/eb-java-7-amazonlinux-64:2.1.3-1.0.0"
                                ]
                            },
                            {
                                "description": "AWS ElasticBeanstalk - Java 8 Running on Amazon Linux 64bit v2.1.3",
                                "name": "aws/codebuild/eb-java-8-amazonlinux-64:2.1.3",
                                "versions": [
                                    "aws/codebuild/eb-java-8-amazonlinux-64:2.1.3-1.0.0"
                                ]
                            },
                            ... LIST TRUNCATED FOR BREVITY ...
                        ]
                    }
                ]
            }
        ]
    }


For more information, see `Docker Images Provided by CodeBuild <https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-available.html>`_ in the *AWS CodeBuild User Guide*
