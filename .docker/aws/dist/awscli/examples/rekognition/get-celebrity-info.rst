**To get information about a celebrity**

The following ``get-celebrity-info`` command displays information about the specified celebrity. The ``id`` parameter comes from a previous call to ``recognize-celebrities``. ::

    aws rekognition get-celebrity-info --id nnnnnnn

Output::

    {
        "Name": "Celeb A", 
        "Urls": [
            "www.imdb.com/name/aaaaaaaaa"
        ]
    }

For more information, see `Getting Information About a Celebrity <https://docs.aws.amazon.com/rekognition/latest/dg/get-celebrity-info-procedure.html>`__ in the *Amazon Rekognition Developer Guide*.
