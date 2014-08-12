export default function (s) {
    s = s.replace(/(^\s*)|(\s*$)/gi, ''); // exclude  start and end white-space
    s = s.replace(/[ ]{2,}/gi, ' '); // 2 or more space to 1
    s = s.replace(/\n /gi, '\n'); // exclude newline with a start spacing
    s = s.replace(/\n+/gi, '\n');
    return s.split(/ |\n/).length;
}