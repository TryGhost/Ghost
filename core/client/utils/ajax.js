/* global ic */

var ajax = window.ajax = function(){
    return ic.ajax.request.apply(null, arguments);
}

export default ajax;