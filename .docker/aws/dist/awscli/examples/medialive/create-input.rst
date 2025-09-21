**To create an input**

The following ``create-input`` example creates an ``HLS PULL`` input by passing in a JSON file that contains the parameters that apply to this type of input. The JSON for this example input specifies two sources (addresses) to the input, in order to support redundancy in the ingest. These addresses require passwords. ::

    aws medialive create-input \
        --cli-input-json file://input-hls-pull-news.json

Contents of ``input-hls-pull-news.json``::

    {
        "Name": "local_news",
        "RequestId": "cli000059",
        "Sources": [
                {
                        "Url": "https://203.0.113.13/newschannel/anytownusa.m3u8",
                        "Username": "examplecorp",
                        "PasswordParam": "/medialive/examplecorp1"
                },
           {
                        "Url": "https://198.51.100.54/fillervideos/oceanwaves.mp4",
                        "Username": "examplecorp",
                        "PasswordParam": "examplecorp2"
                }
        ],
        "Type": "URL_PULL"
    }

**Output:**

The output repeats back the contents of the JSON file, plus the following values. All parameters are ordered alphabetically.

* ``Arn`` for the input. The last part of the ARN is the unique input ID.
* ``Attached Channels``, which is always empty for a newly created input.
* ``Destinations``, which is empty in this example because it is used only with a PUSH input. 
* ``Id`` for the input, the same as the ID in the ARN.
* ``MediaConnectFlows``, which is empty in this example because it is used only with an input of type MediaConnect.
* ``SecurityGroups``, which is empty in this example because it is used only with a PUSH input.
* ``State`` of this input.
* ``Tags``, which is empty (the default for this parameter).

For more information, see `Creating an Input <https://docs.aws.amazon.com/medialive/latest/ug/create-input.html>`__ in the *AWS Elemental MediaLive User Guide*.
