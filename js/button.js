(function(){

    let gameCanvas   = document.getElementById("canvasContainer")
    let beginButton  = document.getElementById("beginButton")
    let splashScreen = document.getElementById("splash")

    beginButton.addEventListener("click", function (e) {
        gameCanvas.style.cursor = "none"
        splash.style.display = "none"

        inGame = true;
    })
    
}());