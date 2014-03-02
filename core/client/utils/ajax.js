/* global ic */
export default function ajax(){
  return ic.ajax.raw.apply(null, arguments);
}
