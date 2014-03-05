var wordCount = function (s) {
    s = s.replace(/(^\s*)|(\s*$)/gi,""); // exclude  start and end white-space
    s = s.replace(/[ ]{2,}/gi," "); // 2 or more space to 1
    s = s.replace(/\n /,"\n"); // exclude newline with a start spacing
    return s.split(' ').length;
}

export default wordCount;