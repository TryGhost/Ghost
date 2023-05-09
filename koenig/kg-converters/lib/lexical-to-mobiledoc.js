export function lexicalToMobiledoc(serializedLexical) {
    const lexical = JSON.parse(serializedLexical);
    const mobiledoc = lexical;

    return JSON.stringify(mobiledoc);
}
