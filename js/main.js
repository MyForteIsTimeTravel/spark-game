/* * * * * * * * * * * * * * * * * * * * * * * * * * *
 *  main.js
 *
 *  Ryan Needham
 * * * * * * * * * * * * * * * * * * * * * * * * * * */
const container = document.getElementById("canvasContainer")

var running = false

var GameState = {
    MENU:     0,
    FLYING:   1,
    LANDING:  2,
    ONFOOT:   3,
    CUTSCENE: 4
}

var currentState = GameState.MENU

function runDat () {
    var playerShip
    var playerSprite
    
    var width     = window.innerWidth
    var height    = window.innerHeight
    
    //if (width  > 1920) width = 1920
    //if (height > 1080) height = 1080

    // handle window resizing
    window.addEventListener('resize', resizeCallback, false);
    function resizeCallback () {
        width  = window.innerWidth
        height = window.innerHeight
        
        //if (width  > 1920) width = 1920
        //if (height > 1080) height = 1080

        camera.aspect = width/height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    /* * * * * * * * * * * * * *
     * Setup WebGL Rendering
     * * * * * * * * * * * * * */
    const VIEW_ANGLE = 45
    const ASPECT     = width / height
    const NEAR       = 0.1
    const FAR        = 10000

    const renderer = new THREE.WebGLRenderer({antialias: true})
    const camera   = new THREE.PerspectiveCamera(VIEW_ANGLE,ASPECT,NEAR,FAR)

    const scene      = new THREE.Scene()
    scene.background = new THREE.Color(0x202020)
    scene.add(camera)

    camera.position.z = 1000
    camera.position.y = 400

    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap

    // Attach canvas renderer
    container.appendChild(renderer.domElement)

    /* * * * * * * * * * * * * *
     * Lighting
     * * * * * * * * * * * * * */
    const pointLight = new THREE.PointLight(0xFFFFFF)
    pointLight.position.x = 180
    pointLight.position.y = 0
    pointLight.position.z = 420
    pointLight.rotation   = 20 * (Math.PI / 180)
    pointLight.castShadow = true
    pointLight.power = 4
    scene.add(pointLight)

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.24)
    scene.add(ambientLight)

    /* * * * * * * * * * * * * * * *
     * World Objects
     * * * * * * * * * * * * * * * */
    var objLoader = new THREE.JSONLoader();
    
    /** 
     *  This cannot be allowed to run asynchronously with the rest of the program
     *  or the render calls will throw null errors while this gets dragged off
     *  disk
     *
     * https://www.turbosquid.com/3d-models/cartoon-planet-c4d/927008 ?
     * https://www.turbosquid.com/3d-models/max-planets-moons-sun/1055232 ?
     */
    objLoader.load('assets/planet2.json', function (geometry) {
        
        // planet
        var material = new THREE.MeshLambertMaterial({color:0xC19A6B});
        var mesh     = new THREE.Mesh( geometry, material );

        mesh.position.x = 0;
        mesh.position.y = 0;
        mesh.position.z = 0;

        mesh.receiveShadow = true
        mesh.castShadow    = true
        
        mesh.scale.x = 10
        mesh.scale.y = 10
        mesh.scale.z = 10

        scene.add(mesh);

        // atmosphere
        const atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry( 260, 100, 100 ),               // Vertex Shader
            new THREE.MeshBasicMaterial({color: 0xFFECB3, transparent: true, opacity: 0.2, side: THREE.DoubleSide})    // Fragment Shader
        );
        
        atmosphere.position.x = 0;
        atmosphere.position.y = 0;
        atmosphere.position.z = 0;
        
        scene.add(atmosphere)
        
        var starCount = 1000
        var stars = new Array()
        var starSpeeds = new Array()

        function betterRand () {
            var rand = Math.random()
            if (Math.random() > 0.5) {rand *= -1} 
            return rand;
        }

        // one way
        for (var i = 0; i < starCount; i++) {
            const obj = new THREE.Mesh(
                new THREE.SphereGeometry( 1, 4, 4 ),               // Vertex Shader
                new THREE.MeshBasicMaterial({color: 0xDDDDDD})    // Fragment Shader
            );

            obj.castShadow     = false
            obj.receiveShadow  = false

            obj.position.x = ((betterRand() * 12) * 300)
            obj.position.y = ((betterRand() * 12) * 300)
            obj.position.z = ((betterRand() * 12) * 300)

            // management
            stars[i] = obj
            var ting = Math.random()
            if (ting < 0.16) {
                obj.material.color.setHex(0xFFFFFF)
                starSpeeds[i] = 0.1 
            }
            else if (ting > 0.16 && ting < 0.66) {
                obj.material.color.setHex(0xAAAAAA)
                starSpeeds[i] = 0.04
            }
            else if (ting > 0.66) {
                obj.material.color.setHex(0x444444)
                starSpeeds[i] = 0.02
            }
            scene.add(obj)
        }
        
        /* * * * * * * * * * * * * * * *
         * playerShip
         * * * * * * * * * * * * * * * */
        playerShip = new THREE.Mesh (
            new THREE.BoxBufferGeometry(1, 0.2, 1), 
            new THREE.MeshBasicMaterial({color: 0x424242})
        )
        
        playerShip.castShadow = true
        playerShip.receiveShadow = true
        
        playerShip.position.y = 399
        playerShip.position.z = 996
        
        scene.add(playerShip);
        
        /* * * * * * * * * * * * * * * *
         * playerSprite
         * * * * * * * * * * * * * * * */
        playerSprite = new THREE.Mesh (
            new THREE.CylinderGeometry( 2, 2, 5, 16),
            new THREE.MeshBasicMaterial({color: 0x000000})
        )
        
        playerSprite.castShadow = true
        playerSprite.receiveShadow = true
        
        playerSprite.position.x = 0
        playerSprite.position.y = 0
        playerSprite.position.z = 0
        
        scene.add(playerSprite)
        
        /* * * * * * * * * * * * * * * *
         * ON UPDATE
         * * * * * * * * * * * * * * * */
        var paused = false
        var tick   = 0

        var radius = 10
        var spin   = 4

        function update () {
            if (!paused) {
                updateTick()
                updateInput()

                /** 
                 *  Animate the stars
                 */
                for (var i = 0; i < starCount; i++) {
                    if (stars[i].position.y > -200) { stars[i].position.y -= starSpeeds[i] }
                    else {stars[i].position.y = 180}
                }
                
                /** 
                 *  When the player is near the planet, stop rotating it
                 */
                var distToOrigin = Math.sqrt(
                    (playerShip.position.x * playerShip.position.x) + 
                    (playerShip.position.y * playerShip.position.y) +
                    (playerShip.position.z * playerShip.position.z)
                )
                
                if (distToOrigin > 300) {
                    // spin planet
                    mesh.rotation.y += 0.001; 
                }

                /** 
                 *  Finite State Scripting
                 */
                switch (currentState) {
                    case GameState.MENU: {
                        break;
                    }
                    case GameState.FLYING: {
                        break;
                    }
                    case GameState.LANDING: {
                        if (distToOrigin > 220) {
                            playerShip.position.x -= playerShip.position.x * 0.01
                            playerShip.position.y -= playerShip.position.y * 0.01
                            playerShip.position.z -= playerShip.position.z * 0.01
                        } else {
                            playerSprite.position.x = playerShip.position.x - 4
                            playerSprite.position.y = playerShip.position.y
                            playerSprite.position.z = playerShip.position.z
                            
                            currentState = GameState.ONFOOT
                        }
                        break;
                    }
                    case GameState.ONFOOT: {
                        break;
                    }
                    case GameState.CUTSCENE: {
                        break;
                    }
                }
                
                // Draw the scene
                renderer.render(scene, camera)
            }

            // see you again soon
            requestAnimationFrame(update)
        }

        // guard against unsafe integer values
        function updateTick () {
            switch (tick == Number.MAX_SAFE_INTEGER) {
                case true:  tick = 0; break
                case false: tick += 0.01;   break
            }
        }

        // Entry Point
        requestAnimationFrame(update);
    }); 
    
    function updateInput () {
        var distToOrigin = Math.sqrt(
            (playerShip.position.x * playerShip.position.x) + 
            (playerShip.position.y * playerShip.position.y) +
            (playerShip.position.z * playerShip.position.z)
        )

        switch (currentState) {
            case GameState.MENU: {
                if ((camera.position.x - playerShip.position.x) > 3.6) { camera.position.x -= 0.01}
                if ((camera.position.y - playerShip.position.y) > 3.6) { camera.position.y -= 0.01}
                if ((camera.position.z - playerShip.position.z) > 3.6) { camera.position.z -= 0.01}
                
                // correct camrea
                camera.lookAt(
                    new THREE.Vector3(
                        playerShip.position.x,
                        playerShip.position.y + 0.4,
                        playerShip.position.z
                    )
                )
                
                break;
            }
            case GameState.FLYING: {
                // W / ^ - forward
                if (wKey || upKey) {
                    // do movement
                    if (shift && (distToOrigin > 260)) {
                        // boost on
                        camera.translateZ(-1)
                        playerShip.translateZ(-1)  
                        // camera back
                        if ((camera.position.x - playerShip.position.x) < 5) { camera.position.x += 0.01}
                        if ((camera.position.y - playerShip.position.y) < 5) { camera.position.y += 0.01}
                        if ((camera.position.z - playerShip.position.z) < 5) { camera.position.z += 0.01}
                    } else {
                        // boost off
                        camera.translateZ(-0.4)
                        playerShip.translateZ(-0.4)  

                        // camera in
                        if ((camera.position.x - playerShip.position.x) > 4) { camera.position.x -= 0.01}
                        if ((camera.position.y - playerShip.position.y) > 4) { camera.position.y -= 0.01}
                        if ((camera.position.z - playerShip.position.z) > 4) { camera.position.z -= 0.01}
                    }

                    // do rotation
                    if      (playerShip.rotation.z < 0.0) { playerShip.rotation.z += 0.01 }
                    else if (playerShip.rotation.z > 0.0) { playerShip.rotation.z -= 0.01}
                } else {
                    // if not moving forward, camera in
                    if ((camera.position.x - playerShip.position.x) > 3.6) { camera.position.x -= 0.01}
                    if ((camera.position.y - playerShip.position.y) > 3.6) { camera.position.y -= 0.01}
                    if ((camera.position.z - playerShip.position.z) > 3.6) { camera.position.z -= 0.01}
                }     

                // A / < - left
                if (aKey || leftKey) {
                    // do movement
                    camera.translateX(-0.4) 
                    playerShip.translateX(-0.4)

                    // do rotation
                    if (playerShip.rotation.y < 0.2) {
                        playerShip.rotation.y += 0.01
                    }
                }

                // S / V - back
                if (sKey || downKey) {

                    // do movement
                    camera.translateZ(0.4) 
                    playerShip.translateZ(0.4)
                }

                // D / > - right
                if (dKey || rightKey) {

                    // do movement
                    camera.translateX(0.4)
                    playerShip.translateX(0.4)

                    // do rotation
                    if (playerShip.rotation.y> -0.2) {
                        playerShip.rotation.y -= 0.01
                    }
                }

                // E - tilt forward
                if (eKey) { playerShip.rotation.x -= 0.01 }
                if (qKey) { playerShip.rotation.x += 0.01 }

                // spacebar - land
                if (spacebar) {
                    if (distToOrigin < 260) {
                        currentState = GameState.LANDING
                    }
                }

                // correct camrea
                camera.lookAt(
                    new THREE.Vector3(
                        playerShip.position.x,
                        playerShip.position.y + 0.4,
                        playerShip.position.z
                    )
                )
                break;
            }
            case GameState.LANDING: {
                camera.lookAt(
                    new THREE.Vector3(
                        playerShip.position.x,
                        playerShip.position.y + 0.4,
                        playerShip.position.z
                    )
                )
                break;
            }
            case GameState.ONFOOT: {
                camera.lookAt(
                    new THREE.Vector3(
                        playerSprite.position.x,
                        playerSprite.position.y + 0.4,
                        playerSprite.position.z
                    )
                )
                break;
            }
            case GameState.CUTSCENE: {
                break;
            }
        }
    }
}

runDat()