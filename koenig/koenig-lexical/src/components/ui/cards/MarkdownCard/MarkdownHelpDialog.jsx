import {Modal} from '../../Modal';

function Th({value}) {
    return (
        <th className="p-2 font-semibold">{value}</th>
    );
}

export function Td({value}) {
    return (
        <td className={`p-2 font-normal ${(value === 'Bold' ? '!font-bold' : (value === 'Emphasize') ? 'italic' : (value === 'Strike-through') ? 'line-through' : (value === 'Link') ? 'cursor-pointer text-green' : '')}`}>
            <span className={` ${(value === 'Inline code') ? 'rounded-sm border border-grey-300 bg-grey-100 p-[.2rem] font-mono text-xs' : (value === 'Highlight') ? 'bg-[#ff0]' : ''}`}>{value}</span>
        </td>
    );
}

export default function MarkdownHelpDialog(props) {
    return (
        <Modal {...props}>
            <div className="p-8 text-left font-sans">
                <header>
                    <h1 className="mr-6 text-2xl font-semibold leading-snug">
                        Markdown Help
                    </h1>
                </header>

                <section className="text-sm leading-snug">
                    <table className="my-5 w-full">
                        <thead>
                            <tr>
                                <Th value='Markdown' />
                                <Th value='Result' />
                                <Th value='Shortcut' />
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <Td value='**text**' />
                                <Td value='Bold' />
                                <Td value='Ctrl/⌘ + B' />
                            </tr>
                            <tr>
                                <Td value='*text*' />
                                <Td value='Emphasize' />
                                <Td value='Ctrl/⌘ + I' />
                            </tr>
                            <tr>
                                <Td value='~~text~~' />
                                <Td value='Strike-through' />
                                <Td value='' />
                            </tr>
                            <tr>
                                <Td value='[title](http://)' />
                                <Td value='Link' />
                                <Td value='Ctrl/⌘ + K' />
                            </tr>
                            <tr>
                                <Td value='`code`' />
                                <Td value='Inline code' />
                                <Td value='Ctrl/⌘ + Alt + C' />
                            </tr>
                            <tr>
                                <Td value='![alt](http://)' />
                                <Td value='Image' />
                                <Td value='Ctrl/⌘ + Shift + I' />
                            </tr>
                            <tr>
                                <Td value='* item' />
                                <Td value='List' />
                                <Td value='Ctrl/⌘ + L' />
                            </tr>
                            <tr>
                                <Td value='1. item' />
                                <Td value='Ordered List' />
                                <Td value='Ctrl/⌘ + Alt + L' />
                            </tr>
                            <tr>
                                <Td value='> quote' />
                                <Td value='Blockquote' />
                                <Td value='Ctrl/⌘ + &apos;' />
                            </tr>
                            <tr>
                                <Td value='==Highlight==' />
                                <Td value='Highlight' />
                                <Td value='' />
                            </tr>
                            <tr>
                                <Td value='# Heading' />
                                <Td value='H1' />
                                <Td value='' />
                            </tr>
                            <tr>
                                <Td value='## Heading' />
                                <Td value='H2' />
                                <Td value='Ctrl/⌘ + H' />
                            </tr>
                            <tr>
                                <Td value='### Heading' />
                                <Td value='H3' />
                                <Td value='Ctrl/⌘ + H (x2)' />
                            </tr>
                        </tbody>
                    </table>
                    <span className="text-sm font-normal">
                        For further Markdown syntax reference: <a href="https://ghost.org/help/using-the-editor/#using-markdown" target="_blank" rel="noopener noreferrer" className="font-medium text-green">Markdown Documentation</a>
                    </span>
                </section>
            </div>
        </Modal>
    );
}
