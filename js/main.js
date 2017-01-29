/* * * * * * * * * * * * * * * * * * * * * * * * * * *
 *  main.js
 *
 *  Ryan Needham
 * * * * * * * * * * * * * * * * * * * * * * * * * * */
const container     = document.getElementById("canvasContainer")
const objList = document.getElementById("objectiveList")
const objective1    = document.getElementById("obj1")
const objective2    = document.getElementById("obj2")
const subBox        = document.getElementById("subtitles")

var GameState    = {MENU:0, FLYING:1, LANDING:2, ONFOOT:3, CUTSCENE:4}
var currentState = GameState.MENU
var running      = false
var arrived      = false
var scriptDepth  = 0

function addObjective (string) {
    const obj = document.createElement("li")
    const str = document.createTextNode(" ▢ " + string)
    
    obj.appendChild(str)
    objList.appendChild(obj)
}

function runDat () {
    var playerSprite
    var playerShip
    var boost1
    var boost2
    var boost3
    var boostColourTicker
    
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

    camera.position.z = 1005
    camera.position.y = 402.5

    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap

    // Attach canvas renderer
    container.appendChild(renderer.domElement)
    
    // Cutscene letterboxing
    var bottomLetterbox = new THREE.Mesh (
        new THREE.BoxBufferGeometry(10, 0.4, 1), 
        new THREE.MeshBasicMaterial({color: 0x121212})
    )
    
    var topLetterbox = new THREE.Mesh (
        new THREE.BoxBufferGeometry(10, 0.4, 1), 
        new THREE.MeshBasicMaterial({color: 0x121212})
    )
    
    scene.add(bottomLetterbox)
    scene.add(topLetterbox)
    
    bottomLetterbox.position = camera.position
    topLetterbox.position    = camera.position
    
    /* * * * * * * * * * * * * *
     *  Physics World
     * * * * * * * * * * * * * */
    const physicsWorld = new CANNON.World()
    physicsWorld.broadphase = new CANNON.NaiveBroadphase()
    
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
    var objLoader     = new THREE.JSONLoader();
    var atmosphereTex = THREE.ImageUtils.loadTexture("assets/planet.png")
    var planetTex     = THREE.ImageUtils.loadTexture("assets/planet.jpg")
    var shipTex       = THREE.ImageUtils.loadTexture("assets/ship.jpg")
    
    atmosphereTex.needsUpdate = true
    planetTex.needsUpdate = true
    shipTex.needsUpdate = true
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
        var material = new THREE.MeshLambertMaterial({/*color:0xA85C2A,*/ map: planetTex});
        var planetMesh     = new THREE.Mesh( geometry, material );

        planetMesh.position.x = 0;
        planetMesh.position.y = 0;
        planetMesh.position.z = 0;

        planetMesh.receiveShadow = true
        planetMesh.castShadow    = true
        
        planetMesh.scale.x = 10
        planetMesh.scale.y = 10
        planetMesh.scale.z = 10

        scene.add(planetMesh);
        
        // planet collision mesh
        var planetCollider = new CANNON.Body({
            mass: 4000,
            shape: new CANNON.Sphere(200)
        })

        planetCollider.position.set(planetMesh.position.x, planetMesh.position.y, planetMesh.position.z)
        physicsWorld.add(planetCollider)
        
        // atmosphere
        const atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry( 260, 100, 100 ),               // Vertex Shader
            new THREE.MeshBasicMaterial({color: 0xF8CD8B, map: atmosphereTex, transparent: true, opacity: 0.3, side: THREE.DoubleSide})    // Fragment Shader
        );
        
        
        atmosphere.position.x = 0;
        atmosphere.position.y = 0;
        atmosphere.position.z = 0;
        
        scene.add(atmosphere)
        
        var starCount = 1000
        var stars = new Array()
        var starSpeeds = new Array()

        // one way
        for (var i = 0; i < starCount; i++) {
            const obj = new THREE.Mesh(
                new THREE.SphereGeometry( 1, 4, 4 ),               // Vertex Shader
                new THREE.MeshBasicMaterial({color: 0xDDDDDD})    // Fragment Shader
            );

            obj.castShadow     = false
            obj.receiveShadow  = false

            obj.position.x = ((betterRand() * 12) * 240)
            obj.position.y = ((betterRand() * 12) * 240)
            obj.position.z = ((betterRand() * 12) * 240)

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
            new THREE.MeshBasicMaterial({color: 0x525252, map: shipTex})
        )
        
        boost1 = new THREE.Mesh (
            new THREE.CircleGeometry(0.08, 16),
            new THREE.MeshBasicMaterial( { color: 0x000000  } )
        ) 
        
        boost2 = new THREE.Mesh (
            new THREE.CircleGeometry(0.10, 16),
            new THREE.MeshBasicMaterial( { color: 0x000000  } )
        ) 
        
        boost3 = new THREE.Mesh (
            new THREE.CircleGeometry(0.08, 16),
            new THREE.MeshBasicMaterial( { color: 0x000000  } )
        ) 
        
        var leftWing = new THREE.Mesh (
            new THREE.BoxBufferGeometry(0.6, 0.12, 1),
            new THREE.MeshBasicMaterial({color: 0xAAAAAA, map: shipTex})
        )
        
        var rightWing = new THREE.Mesh (
            new THREE.BoxBufferGeometry(0.6, 0.12, 1),
            new THREE.MeshBasicMaterial({color: 0xAAAAAA, map: shipTex})
        )
        
        playerShip.add(boost1)
        playerShip.add(boost2)
        playerShip.add(boost3)
        playerShip.add(leftWing)
        playerShip.add(rightWing)
        
        boostColourTicker = 0
        boost1.translateZ(0.51)
        boost2.translateZ(0.51)
        boost3.translateZ(0.51)
        
        boost1.translateX(0.32)
        boost3.translateX(-0.32)
        
        rightWing.translateZ(0.1)
        leftWing.translateZ(0.1)
        
        rightWing.translateX(0.75)
        leftWing.translateX(-0.75)
        
        rightWing.rotation.z += 0.2
        leftWing.rotation.z += -0.2
        
        rightWing.castShadow = true
        leftWing.castShadow = true
        
        rightWing.receiveShadow = true
        leftWing.receiveShadow = true
        
        playerShip.castShadow = true
        playerShip.receiveShadow = true
        
        playerShip.position.y = 399
        playerShip.position.z = 996
        
        scene.add(playerShip);
        
        // playerShip collider
        var playerShipCollider = new CANNON.Body({
            mass: 4,
            shape: new CANNON.Box(new CANNON.Vec3())
        })
        
        playerShipCollider.position.set(playerShip.position.x, playerShip.position.y, playerShip.position.z)
        physicsWorld.add(playerShipCollider)
        
        /* * * * * * * * * * * * * * * *
         * playerSprite
         * * * * * * * * * * * * * * * */
        playerSprite = new THREE.Mesh (
            new THREE.CylinderGeometry( 0.2, 0.2, 2, 16),
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
                
                updatePhysicsWorld()
                        // update positions
                        planetCollider.position.x = planetMesh.position.x
                        planetCollider.position.y = planetMesh.position.y
                        planetCollider.position.z = planetMesh.position.z

                        playerShipCollider.position.x = playerShip.position.x
                        playerShipCollider.position.y = playerShip.position.y
                        playerShipCollider.position.z = playerShip.position.z

                        // test collisions
                        physicsWorld.step(tick)

                        // update positions
                        planetMesh.position.x = planetCollider.position.x
                        planetMesh.position.y = planetCollider.position.y
                        planetMesh.position.z = planetCollider.position.z

                        playerShip.position.x = playerShipCollider.position.x
                        playerShip.position.y = playerShipCollider.position.y
                        playerShip.position.z = playerShipCollider.position.z

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
            
                                
                if (distToOrigin > 280) {
                    planetMesh.rotation.y += 0.00065; 
                    atmosphere.rotation.y += 0.001
                    atmosphere.rotation.z += 0.0003
                }
                
                /** 
                 *  Script Objectives
                 */
                if (distToOrigin - 230 <= 0) { arrived = true }
                if (arrived) { objective1.innerHTML = " ▣ Investigate the planet"; } 
                else         { objective1.innerHTML = " ▢ Investigate the planet: " + round(distToOrigin - 230, 0) + " △"; }
                
                /** 
                 *  Script Subtitles (audio later)
                 */
                if (distToOrigin - 230 < 800 && scriptDepth < 1) { scriptDepth = 1; subBox.innerHTML = "<h3>Daughter: </h3><p>hey! everything's going well, the expedition is really fun.</p>" }
                if (distToOrigin - 230 < 650 && scriptDepth < 2) { scriptDepth = 2; subBox.innerHTML = "<h3>Daughter: </h3><p>it's me again. We've been diverted to this weird solar system i've never heard of... oh well, see you soon!</p>" }
                if (distToOrigin - 230 < 500 && scriptDepth < 3) { scriptDepth = 3; subBox.innerHTML = "<h3>Daughter: </h3><p>help.</p>" }
                if (distToOrigin - 230 < 300 && scriptDepth < 4) { scriptDepth = 4; subBox.innerHTML = "<h3>Daughter: </h3><p>everyone is gone. i need you. find me soon.</p>" }
                if (arrived                  && scriptDepth < 5) { scriptDepth = 5; subBox.innerHTML = "<h3>You: </h3><p>the whole planet looks deserted</p>"}
                /** 
                 *  Finite State Scripting
                 */
                switch (currentState) {
                    case GameState.MENU: {
                        bottomLetterbox.position.x = camera.position.x
                        bottomLetterbox.position.y = camera.position.y
                        bottomLetterbox.position.z = camera.position.z
                        
                        topLetterbox.position.x    = camera.position.x
                        topLetterbox.position.y    = camera.position.y
                        topLetterbox.position.z    = camera.position.z
                        
                        bottomLetterbox.rotation.x = camera.rotation.x
                        bottomLetterbox.rotation.y = camera.rotation.y
                        bottomLetterbox.rotation.z = camera.rotation.z
                        
                        topLetterbox.rotation.x = camera.rotation.x
                        topLetterbox.rotation.y = camera.rotation.y
                        topLetterbox.rotation.z = camera.rotation.z
                        
                        bottomLetterbox.translateY(-2)
                        bottomLetterbox.translateZ(-5)

                        topLetterbox.translateY(2)
                        topLetterbox.translateZ(-5)
                        break;
                    }
                    case GameState.FLYING: {
                        break;
                    }
                    case GameState.LANDING: {
                        if (distToOrigin > 240) {
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
                        /*
                        physicsWorld.gravity.set(
                            planetMesh.position.x - playerSprite.position.x, 
                            planetMesh.position.y - playerSprite.position.y,
                            planetMesh.position.z - playerSprite.position.z
                        ) // into the origin on every axis
                        */
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
    
    function updatePhysicsWorld () {

    }
    
    function updateInput () {
        var distToOrigin = Math.sqrt(
            (playerShip.position.x * playerShip.position.x) + 
            (playerShip.position.y * playerShip.position.y) +
            (playerShip.position.z * playerShip.position.z)
        )

        switch (currentState) {
            case GameState.MENU: {
                if ((camera.position.x - playerShip.position.x) > 3.6) { camera.position.x -= (camera.position.x - playerShip.position.x) * 0.002}
                if ((camera.position.y - playerShip.position.y) > 3.6) { camera.position.y -= (camera.position.y - playerShip.position.y) * 0.002}
                if ((camera.position.z - playerShip.position.z) > 3.6) { camera.position.z -= (camera.position.z - playerShip.position.z) * 0.002}
                
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
                
                // idle flying in aatmosphere
                if (distToOrigin < 280) {
                    camera.translateZ(-0.165)
                    playerShip.translateZ(-0.165)
                    
                    // booster feedback
                    if (boostColourTicker < 25) { // 16777215 is 0xFFFFFF as int
                        boost1.material.color.setHex(boost1.material.color.getHex() + 0x010101)
                        boost2.material.color.setHex(boost2.material.color.getHex() + 0x010101)
                        boost3.material.color.setHex(boost3.material.color.getHex() + 0x010101)
                        boostColourTicker += 1
                    }
                    if (boostColourTicker > 25) { // 16777215 is 0xFFFFFF as int
                        boost1.material.color.setHex(boost1.material.color.getHex() - 0x010101)
                        boost2.material.color.setHex(boost2.material.color.getHex() - 0x010101)
                        boost3.material.color.setHex(boost3.material.color.getHex() - 0x010101)
                        boostColourTicker -= 1
                    }
                    // camera back
                    if ((camera.position.x - playerShip.position.x) < 5) { camera.position.x += 0.01}
                    if ((camera.position.y - playerShip.position.y) < 5) { camera.position.y += 0.01}
                    if ((camera.position.z - playerShip.position.z) < 5) { camera.position.z += 0.01}
                }
                
                // W / ^ - forward
                if (wKey || upKey) {
                    // do movement
                    if (shift && (distToOrigin > 260)) {
                        // boost on
                        camera.translateZ(-0.5)
                        playerShip.translateZ(-0.5)  
                        // booster feedback
                        if (boostColourTicker < 100) { // 16777215 is 0xFFFFFF as int
                            boost1.material.color.setHex(boost1.material.color.getHex() + 0x010101)
                            boost2.material.color.setHex(boost2.material.color.getHex() + 0x010101)
                            boost3.material.color.setHex(boost3.material.color.getHex() + 0x010101)
                            boostColourTicker += 1
                        }
                        // camera back and shake
                        if ((camera.position.x - playerShip.position.x) < 5) { camera.position.x += 0.01} else { camera.translateX(betterRand() * 0.025) }
                        if ((camera.position.y - playerShip.position.y) < 5) { camera.position.y += 0.01} else { camera.translateY(betterRand() * 0.025) }
                        if ((camera.position.z - playerShip.position.z) < 5) { camera.position.z += 0.01} else { camera.translateZ(betterRand() * 0.025) } 
                    } else {
                        // boost off
                        camera.translateZ(-0.2)
                        playerShip.translateZ(-0.2) 
                        // booster feedback
                        if (boostColourTicker < 50) { // 16777215 is 0xFFFFFF as int
                            boost1.material.color.setHex(boost1.material.color.getHex() + 0x010101)
                            boost2.material.color.setHex(boost2.material.color.getHex() + 0x010101)
                            boost3.material.color.setHex(boost3.material.color.getHex() + 0x010101)
                            boostColourTicker += 1
                        } else if (boostColourTicker > 50) {
                            boost1.material.color.setHex(boost1.material.color.getHex() - 0x010101)
                            boost2.material.color.setHex(boost2.material.color.getHex() - 0x010101)
                            boost3.material.color.setHex(boost3.material.color.getHex() - 0x010101)
                            boostColourTicker -= 1
                        }
                        
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
                    if (boostColourTicker > 0) {
                        boost1.material.color.setHex(boost1.material.color.getHex() - 0x010101)
                        boost2.material.color.setHex(boost2.material.color.getHex() - 0x010101)
                        boost3.material.color.setHex(boost3.material.color.getHex() - 0x010101)
                        boostColourTicker -= 1
                    }
                }     

                // A / < - left
                if (aKey || leftKey) {
                    // do movement
                    camera.translateX(-0.4) 
                    playerShip.translateX(-0.4)

                    // do rotation
                    playerShip.rotation.y += 0.01
    
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
                    playerShip.rotation.y -= 0.01
                }

                // E - tilt forward
                if (eKey) { playerShip.rotation.x -= 0.01 }
                if (qKey) { playerShip.rotation.x += 0.01 }

                // spacebar - land
                if (spacebar) {
                    if (distToOrigin < 260) {
                        currentState = GameState.LANDING
                        spacebar = false
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
                var distToShip = Math.sqrt(
                    ((playerShip.position.x - playerSprite.position.x) * (playerShip.position.x - playerSprite.position.x)) + 
                    ((playerShip.position.y - playerSprite.position.y) * (playerShip.position.y - playerSprite.position.y)) +
                    ((playerShip.position.z - playerSprite.position.z) * (playerShip.position.z - playerSprite.position.z))
                )
                
                // move forward
                if (wKey || upKey) {
                    playerSprite.translateZ(0.1)
                    camera.translateZ(0.1)
                }
                
                // move backwards
                if (sKey || downKey) {
                    playerSprite.translateZ(-0.1)
                    camera.translateZ(-0.1)
                }
                
                // move left
                if (aKey || leftKey) {
                    playerSprite.translateX(0.1)
                    camera.translateX(0.1)
                }
                
                // move right
                if (dKey || rightKey) {
                    playerSprite.translateX(-0.1)
                    camera.translateX(-0.1)
                }
                
                // enter ship
                if (spacebar) {
                    if (distToShip < 10) {
                        playerSprite.position.x = 0
                        playerSprite.position.y = 0
                        playerSprite.position.z = 0
                        
                        camera.position.x = playerShip.position.x
                        camera.position.y = playerShip.position.y
                        camera.position.z = playerShip.position.z
                        
                        camera.translateZ(-1)
                        
                        camera.lookAt (
                            new THREE.Vector3 (
                                playerShip.position.x,
                                playerShip.position.y + 0.4,
                                playerShip.position.z
                            )
                        )
                        
                        currentState = GameState.FLYING
                        spacebar = false
                    }
                }
                
                camera.lookAt (
                    new THREE.Vector3 (
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