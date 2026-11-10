// ipaddr.js 2.x documents and ships IPv6#toFixedLengthString, but its bundled
// types omit it. This merges into those types; drop it once upstream adds it.
import 'ipaddr.js';

declare module 'ipaddr.js' {
  interface IPv6 {
    /** The address as eight four-digit hex groups, e.g. 2001:0db8:0000:...:0001. */
    toFixedLengthString(): string;
  }
}
