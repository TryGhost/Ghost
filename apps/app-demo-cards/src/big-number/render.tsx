import renderToString from 'preact-render-to-string';
import type { CardRenderer } from '@tryghost/app-sdk/cards';

import { text } from '../shared.ts';

/** A key figure, set large, with what it means underneath. Static everywhere. */
export interface BigNumber {
  title: string;
  number: string;
  label: string;
  source: string;
}

export function readBigNumber(properties: Record<string, unknown>): BigNumber {
  return {
    title: text(properties, 'title', 'Key figure'),
    number: text(properties, 'number', '73%'),
    label: text(properties, 'label', 'Say what the number means, in a line or two.'),
    source: text(properties, 'source'),
  };
}

function BigNumberCard({ value }: { value: BigNumber }) {
  return (
    <figure className="big-number">
      {value.title && <p className="big-number__title">{value.title}</p>}
      <p className="big-number__number">{value.number}</p>
      {value.label && <figcaption className="big-number__label">{value.label}</figcaption>}
      {value.source && <p className="big-number__source">Source: {value.source}</p>}
    </figure>
  );
}

/** The same figure for email, in inline styles only. */
function EmailBigNumber({ value }: { value: BigNumber }) {
  return (
    <table
      role="presentation"
      width="100%"
      style={{
        borderCollapse: 'collapse',
        borderTop: '2px solid #1d1d1b',
        borderBottom: '1px solid #c9c9c5',
      }}
    >
      <tbody>
        <tr>
          <td style={{ padding: '20px 0 22px', color: '#1d1d1b' }}>
            {value.title && (
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: '#5b5b56',
                }}
              >
                {value.title}
              </p>
            )}
            <p
              style={{
                margin: '0',
                fontSize: '56px',
                lineHeight: '1',
                fontWeight: '700',
                letterSpacing: '-.03em',
              }}
            >
              {value.number}
            </p>
            {value.label && (
              <p
                style={{
                  margin: '10px 0 0',
                  fontSize: '17px',
                  lineHeight: '1.4',
                  color: '#3d3d39',
                }}
              >
                {value.label}
              </p>
            )}
            {value.source && (
              <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#8a8a83' }}>
                Source: {value.source}
              </p>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

const css = `
.big-number { margin: 0; padding: 22px 0 24px; border-top: 2px solid #1d1d1b; border-bottom: 1px solid #c9c9c5; color: #1d1d1b; }
.big-number__title { margin: 0 0 6px; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #5b5b56; }
.big-number__number { margin: 0; font-size: clamp(48px, 11vw, 88px); line-height: 1; font-weight: 700; letter-spacing: -.035em; font-variant-numeric: tabular-nums; }
.big-number__label { margin: 12px 0 0; max-width: 34ch; font-size: 19px; line-height: 1.4; color: #3d3d39; }
.big-number__source { margin: 14px 0 0; font-size: 12px; color: #8a8a83; }
`;

export const renderBigNumber: CardRenderer = ({ properties }) => {
  const value = readBigNumber(properties);
  return {
    html: renderToString(<BigNumberCard value={value} />),
    css,
    height: 220,
    email_html: renderToString(<EmailBigNumber value={value} />),
  };
};
