/* global ic */
export default window.ajax = function(){
  return ic.ajax.request.apply(null, arguments);
}
