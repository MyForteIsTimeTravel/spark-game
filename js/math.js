// http://stackoverflow.com/questions/7342957/how-do-you-round-to-1-decimal-place-in-javascript
function round(value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}