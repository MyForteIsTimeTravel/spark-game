/* * * * * * * * * * * * * * * * * * * * * * * * * * *
 *  main.js
 *
 *  Ryan Needham
 * * * * * * * * * * * * * * * * * * * * * * * * * * */
const container = document.getElementById("canvasContainer")
var inGame = false

function runDat () {
    var   ship
    
    var   width     = window.innerWidth
    var   height    = window.innerHeight
    
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
    const camera   = new THREE.PerspectiveCamera(
        VIEW_ANGLE,
        ASPECT,
        NEAR,
        FAR
    )

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
         * Ship
         * * * * * * * * * * * * * * * */
        ship = new THREE.Mesh(
            new THREE.BoxBufferGeometry(1, 0.2, 1), 
            new THREE.MeshBasicMaterial({color: 0x424242})
        )
        
        ship.castShadow = true
        ship.receiveShadow = true
        
        ship.position.y = 399
        ship.position.z = 996
        
        scene.add(ship);
        
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

                for (var i = 0; i < starCount; i++) {
                    if (stars[i].position.y > -200) {
                       stars[i].position.y -= starSpeeds[i];
                    }
                    else {
                        stars[i].position.y = 180
                    }
                }

                // spin planet
                mesh.rotation.y += 0.001;   

                // rock the boat: NEEDS TO BE GENTLER
                /*
                if (Math.random() > 0.5) { ship.position.x += Math.random() * 0.0012 }
                else { ship.position.x -= Math.random() * 0.0012 }
                */
                
               // console.out ("(x: , y: , z: )")
                
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
   
    var mouseMovementX = 0
    var mouseMovementY = 0

    var shift    = false
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
        if (inGame) {
            switch (e.keyCode) {
                case 16: shift    = true; break
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
        if (inGame) {
            switch (e.keyCode) {
                case 16: shift    = false; break
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

    function updateInput () {
        // W - forward
        if (wKey || upKey) {
            
            // do movement
            if (shift) {
                
                // boost on
                camera.translateZ(-1)
                ship.translateZ(-1)  
                
                // camera back
                if ((camera.position.x - ship.position.x) < 5) { camera.position.x += 0.01}
                if ((camera.position.y - ship.position.y) < 5) { camera.position.y += 0.01}
                if ((camera.position.z - ship.position.z) < 5) { camera.position.z += 0.01}
            }
            
            else {
                
                // boost off
                camera.translateZ(-0.4)
                ship.translateZ(-0.4)  
                
                // camera in
                if ((camera.position.x - ship.position.x) > 4) { camera.position.x -= 0.01}
                if ((camera.position.y - ship.position.y) > 4) { camera.position.y -= 0.01}
                if ((camera.position.z - ship.position.z) > 4) { camera.position.z -= 0.01}
                
            }

            // do rotation
            if (ship.rotation.z < 0.0) {
                ship.rotation.z += 0.01
            } else if (ship.rotation.z > 0.0) {
                ship.rotation.z -= 0.01
            }
        } else {
            // if not moving forward, camera in
            
            // camera in
            if ((camera.position.x - ship.position.x) > 3) { camera.position.x -= 0.01}
            if ((camera.position.y - ship.position.y) > 3) { camera.position.y -= 0.01}
            if ((camera.position.z - ship.position.z) > 3) { camera.position.z -= 0.01}
        }     
        
        // A - left
        if (aKey || leftKey) {
            
            // do movement
            camera.translateX(-0.4) 
            ship.translateX(-0.4)
            
            // do rotation
            if (ship.rotation.y < 0.2) {
                ship.rotation.y += 0.01
            }
        }
        
        // S - back
        if (sKey || downKey) {
            
            // do movement
            camera.translateZ(0.4) 
            ship.translateZ(0.4)
        }
        
        // D - right
        if (dKey || rightKey) {
            
            // do movement
            camera.translateX(0.4)
            ship.translateX(0.4)
            
            // do rotation
            if (ship.rotation.y> -0.2) {
                ship.rotation.y -= 0.01
            }
        }
        
        // E - tilt forward
        if (eKey) {
            ship.rotation.x -= 0.01
        }
        
        if (qKey) {
            ship.rotation.x += 0.01
        }
        
        // correct camrea
        camera.lookAt(
            new THREE.Vector3(
                ship.position.x,
                ship.position.y + 0.4,
                ship.position.z
            )
        )
    }
}

runDat()
