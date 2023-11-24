import * as THREE from 'three';

			import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
			import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
			import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
            

			let camera, scene, renderer;			
            var clock             = undefined ;
            var physicsUniverse     = undefined;
            var tmpTransformation     = undefined;
            var rigidBody_List = new Array();

            Ammo().then( AmmoStart );
            function AmmoStart()
            {
                //code
                tmpTransformation = new Ammo.btTransform();

                initPhysicsUniverse();
                initGraphicsUniverse();

                 // base
                createCube(40 , new THREE.Vector3(10, -30, 10) , 0 );
                // falling cubes
                createDog(1 , new THREE.Vector3(0, 10, 0) , 1, null );
                createDog(1 , new THREE.Vector3(10, 30, 0) , 1, null );
                createDog(1 , new THREE.Vector3(10, 20, 10) , 1, null );
                createDog(1, new THREE.Vector3(5, 40, 20) , 1, null );
                createDog(1 , new THREE.Vector3(25, 100, 5) , 1, null );
                createDog(1 , new THREE.Vector3(20, 60, 25) , 1, null );
                createDog(1 , new THREE.Vector3(20, 100, 25) , 1, null );
                createDog(1 , new THREE.Vector3(20, 200, 25) , 1, null );
                
			    render();
            }

            function initPhysicsUniverse()
            {
                var collisionConfiguration  = new Ammo.btDefaultCollisionConfiguration();
                var dispatcher              = new Ammo.btCollisionDispatcher(collisionConfiguration);
                var overlappingPairCache    = new Ammo.btDbvtBroadphase();
                var solver                  = new Ammo.btSequentialImpulseConstraintSolver();
                physicsUniverse             = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
                physicsUniverse.setGravity(new Ammo.btVector3(0, -75, 0));
            }

			function initGraphicsUniverse() {

                //clock
                clock = new THREE.Clock();
                
                //scene
				scene = new THREE.Scene();
				scene.background = new THREE.Color( 0xf6eedc );

                //cam
				camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 1000 );
                camera.position.set( -25, 20, -25 );
                camera.lookAt(new THREE.Vector3(0, 6, 0));

				
				//objects loader
                
				
				

				//renderer
				renderer = new THREE.WebGLRenderer( { antialias: true } );
				renderer.setPixelRatio( window.devicePixelRatio );
				renderer.setSize( window.innerWidth, window.innerHeight );
				document.body.appendChild( renderer.domElement );

                //camera control
				const controls = new OrbitControls( camera, renderer.domElement );
				controls.addEventListener( 'change', render );
				controls.target.set( 0, 2, 0 );
				controls.update();

                //window resize
				window.addEventListener( 'resize', onWindowResize );

                //light
                var ambientLight = new THREE.AmbientLight(0xcccccc, 0.2);
                scene.add(ambientLight);
                var directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
                directionalLight.position.set(-1, 0.9, 0.4);
                scene.add(directionalLight);

			}

            function createDog(scale , position, mass, rot_quaternion)
            {

                let quaternion = undefined;

                if(rot_quaternion == null)
                {
                    quaternion = {x: 0, y: 0, z: 0, w:  1};
                }
                else
                {
                quaternion = rot_quaternion;
                }

                // ------ Graphics Universe - Three.JS ------
                const dracoLoader = new DRACOLoader();
				dracoLoader.setDecoderPath( 'jsm/libs/draco/gltf/' );

                
				const loader = new GLTFLoader();
				loader.setDRACOLoader( dracoLoader );
				loader.setPath( 'models/' );
                loader.load( 'shiba.glb', function ( gltf ) {
                    var dog = gltf.scene;
                   
                    dog.position.set(position.x,position.y,position.z);                   
					scene.add( dog );

					render();

                // ------ Physics Universe - Ammo.js ------
                let transform = new Ammo.btTransform();
                transform.setIdentity();
                transform.setOrigin( new Ammo.btVector3( position.x, position.y, position.z ) );
                transform.setRotation( new Ammo.btQuaternion( quaternion.x, quaternion.y, quaternion.z, quaternion.w ) );
                let defaultMotionState = new Ammo.btDefaultMotionState( transform );

                let structColShape = new Ammo.btCapsuleShape( scale*0.5, scale*1, scale*0.5 );
                structColShape.setMargin( 0.05 );

                let localInertia = new Ammo.btVector3( 0, 0, 0 );
                structColShape.calculateLocalInertia( mass, localInertia );

                let RBody_Info = new Ammo.btRigidBodyConstructionInfo( mass, defaultMotionState, structColShape, localInertia );
                let RBody = new Ammo.btRigidBody( RBody_Info );

                physicsUniverse.addRigidBody( RBody );

                dog.userData.physicsBody = RBody;

                rigidBody_List.push(dog);

				} );

                
            }

            function createCube(scale , position, mass, rot_quaternion)
            {

                let quaternion = undefined;

                if(rot_quaternion == null)
                {
                    quaternion = {x: 0, y: 0, z: 0, w:  1};
                }
                else
                {
                quaternion = rot_quaternion;
                }

                // ------ Graphics Universe - Three.JS ------
                let newcube = new THREE.Mesh(new THREE.BoxGeometry(scale, scale, scale), new THREE.MeshPhongMaterial({color: Math.random() * 0xffffff}));
                newcube.position.set(position.x, position.y, position.z);
                scene.add(newcube);

                // ------ Physics Universe - Ammo.js ------
                let transform = new Ammo.btTransform();
                transform.setIdentity();
                transform.setOrigin( new Ammo.btVector3( position.x, position.y, position.z ) );
                transform.setRotation( new Ammo.btQuaternion( quaternion.x, quaternion.y, quaternion.z, quaternion.w ) );
                let defaultMotionState = new Ammo.btDefaultMotionState( transform );

                let structColShape = new Ammo.btBoxShape( new Ammo.btVector3( scale*0.5, scale*0.5, scale*0.5 ) );
                structColShape.setMargin( 0.05 );

                let localInertia = new Ammo.btVector3( 0, 0, 0 );
                structColShape.calculateLocalInertia( mass, localInertia );

                let RBody_Info = new Ammo.btRigidBodyConstructionInfo( mass, defaultMotionState, structColShape, localInertia );
                let RBody = new Ammo.btRigidBody( RBody_Info );

                physicsUniverse.addRigidBody( RBody );

                newcube.userData.physicsBody = RBody;

                rigidBody_List.push(newcube);
            }

            function updatePhysicsUniverse( deltaTime )
            {
                physicsUniverse.stepSimulation( deltaTime, 10 );
                for ( let i = 0; i < rigidBody_List.length; i++ )
                {
                    //code
                    let Graphics_Obj = rigidBody_List[ i ];
                    let Physics_Obj = Graphics_Obj.userData.physicsBody;

                    let motionState = Physics_Obj.getMotionState();
                    if ( motionState )
                    {
                        motionState.getWorldTransform( tmpTransformation );
                        let new_pos = tmpTransformation.getOrigin();
                        let new_qua = tmpTransformation.getRotation();
                        Graphics_Obj.position.set( new_pos.x(), new_pos.y(), new_pos.z() );
                        Graphics_Obj.quaternion.set( new_qua.x(), new_qua.y(), new_qua.z(), new_qua.w() );
                    }
                }
            }

			function onWindowResize() {

				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();

				renderer.setSize( window.innerWidth, window.innerHeight );

				render();

			}

			//

			function render() {

                let deltaTime = clock.getDelta();
                updatePhysicsUniverse( deltaTime );
                        
                renderer.render( scene, camera );
                requestAnimationFrame( render );

			}