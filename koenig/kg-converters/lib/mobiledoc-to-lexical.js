export function mobiledocToLexical(serializedMobiledoc) {
    const mobiledoc = JSON.parse(serializedMobiledoc);
    const lexical = mobiledoc;

    return JSON.stringify(lexical);
}
