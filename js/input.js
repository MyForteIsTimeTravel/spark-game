(function(){

    let gameCanvas   = document.getElementById("canvasContainer")
    let beginButton  = document.getElementById("beginButton")
    let splashScreen = document.getElementById("splash")

    beginButton.addEventListener("click", function (e) {
        gameCanvas.style.cursor = "none"
        splash.style.display = "none"

        currentState = GameState.FLYING
        running = true;
    })
    
}());

var mouseMovementX = 0
var mouseMovementY = 0

var shift    = false
var spacebar = false
var wKey     = false
var aKey     = false
var sKey     = false
var dKey     = false
var eKey     = false
var qKey     = false
var upKey    = false
var downKey  = false
var leftKey  = false
var rightKey = false

document.body.addEventListener("keydown", function (e) {
    if (running) {
        switch (e.keyCode) {
            case 16: shift    = true; break
            case 32: spacebar = true; break
            case 37: leftKey  = true; break
            case 38: upKey    = true; break
            case 39: rightKey = true; break
            case 40: downKey  = true; break
            case 87: wKey     = true; break
            case 65: aKey     = true; break
            case 83: sKey     = true; break
            case 68: dKey     = true; break
            case 69: eKey     = true; break
            case 81: qKey     = true; break
        }   
    }
})

document.body.addEventListener("keyup", function (e) {
    if (running) {
        switch (e.keyCode) {
            case 16: shift    = false; break
            case 32: spacebar = false; break
            case 37: leftKey  = false; break
            case 38: upKey    = false; break
            case 39: rightKey = false; break
            case 40: downKey  = false; break
            case 87: wKey     = false; break
            case 65: aKey     = false; break
            case 83: sKey     = false; break
            case 68: dKey     = false; break
            case 69: eKey     = false; break
            case 81: qKey     = false; break
        }     
    }  
})

   