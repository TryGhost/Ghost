**To store a lexicon**

The following ``put-lexicon`` example stores the specified pronunciation lexicon. The ``example.pls`` file specifies a W3C PLS-compliant lexicon. ::

    aws polly put-lexicon \
        --name w3c \
        --content file://example.pls

Contents of ``example.pls`` ::

    {
        <?xml version="1.0" encoding="UTF-8"?>
        <lexicon version="1.0" 
            xmlns="http://www.w3.org/2005/01/pronunciation-lexicon"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
            xsi:schemaLocation="http://www.w3.org/2005/01/pronunciation-lexicon 
                http://www.w3.org/TR/2007/CR-pronunciation-lexicon-20071212/pls.xsd"
            alphabet="ipa" 
            xml:lang="en-US">
            <lexeme>
                <grapheme>W3C</grapheme>
                <alias>World Wide Web Consortium</alias>
            </lexeme>
        </lexicon>
    }

This command produces no output.

For more information, see `Using the PutLexicon operation <https://docs.aws.amazon.com/polly/latest/dg/gs-put-lexicon.html>`__ in the *Amazon Polly Developer Guide*.
