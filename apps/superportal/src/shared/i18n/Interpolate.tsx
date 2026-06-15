/**
 * Tiny element-interpolation helper, mirroring @doist/react-interpolate's API
 * without the dependency. Renders a single translated string that embeds React
 * elements, so we never split a sentence across multiple t() calls.
 *
 *   <Interpolate
 *     string={translated}   // "{memberEmail} will no longer receive {newsletterName} newsletter."
 *     mapping={{memberEmail: <strong>{email}</strong>, newsletterName: <strong>{name}</strong>}}
 *   />
 *
 *   <Interpolate
 *     string={translated}   // "Manage your preferences <button>here</button>."
 *     mapping={{button: <button onClick={...} />}}
 *   />
 *
 * - `{var}` is replaced by the mapped node.
 * - `<tag>inner</tag>` clones the mapped element with `inner` as its children.
 */

import {cloneElement, isValidElement, type ReactElement, type ReactNode} from 'react';

interface Props {
    string: string;
    mapping: Record<string, ReactNode>;
}

const TOKEN = /<(\w+)>(.*?)<\/\1>|\{(\w+)\}/;

export function Interpolate({string: str, mapping}: Props): ReactElement {
    const nodes: ReactNode[] = [];
    let remaining = str;
    let key = 0;

    let m = TOKEN.exec(remaining);
    while (m) {
        const before = remaining.slice(0, m.index);
        if (before) nodes.push(before);

        const tag = m[1];
        const inner = m[2];
        const varName = m[3];

        if (tag) {
            const el = mapping[tag];
            nodes.push(isValidElement(el) ? cloneElement(el as ReactElement, {key: key++}, inner) : inner);
        } else if (varName) {
            const val = mapping[varName];
            nodes.push(isValidElement(val) ? cloneElement(val as ReactElement, {key: key++}) : <span key={key++}>{val}</span>);
        }

        remaining = remaining.slice(m.index + m[0].length);
        m = TOKEN.exec(remaining);
    }
    if (remaining) nodes.push(remaining);

    return <>{nodes}</>;
}
