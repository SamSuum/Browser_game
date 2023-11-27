 
import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';
import { Capsule } from 'three/addons/math/Capsule.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

//constants

const clock = new THREE.Clock();

//scene
const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x88ccee );
scene.fog = new THREE.Fog( 0x88ccee, 0, 50 );

//cam
const camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.rotation.order = 'YXZ';

//lighting
const fillLight1 = new THREE.HemisphereLight( 0x8dc1de, 0x00668d, 1.5 );
    fillLight1.position.set( 2, 1, 1 );
    scene.add( fillLight1 );            
const directionalLight = new THREE.DirectionalLight( 0xffffff, 2.5 );
    directionalLight.position.set( - 5, 25, - 1 );
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.01;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.left = - 30;
    directionalLight.shadow.camera.top	= 30;
    directionalLight.shadow.camera.bottom = - 30;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.radius = 4;
    directionalLight.shadow.bias = - 0.00006;
    scene.add( directionalLight );

const container = document.getElementById( 'app' );

const renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild( renderer.domElement );

const stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );

const GRAVITY = 30;

const NUM_SPHERES = 100;
const SPHERE_RADIUS = 0.2;

const STEPS_PER_FRAME = 5;

const sphereGeometry = new THREE.IcosahedronGeometry( SPHERE_RADIUS, 5 );
const sphereMaterial = new THREE.MeshLambertMaterial( { color: 0xdede8d } );

const spheres = [];
let sphereIdx = 0;

for ( let i = 0; i < NUM_SPHERES; i ++ ) {

    const sphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    scene.add( sphere );

    spheres.push( {
        mesh: sphere,
        collider: new THREE.Sphere( new THREE.Vector3( 0, - 100, 0 ), SPHERE_RADIUS ),
        velocity: new THREE.Vector3()
    } );

}

const worldOctree = new Octree();

const playerCollider = new Capsule( new THREE.Vector3( 0, 0.35, 0 ), new THREE.Vector3( 0, 1, 0 ), 0.35 );

const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let playerOnFloor = false;
let mouseTime = 0;

const keyStates = {};

const vector1 = new THREE.Vector3();
const vector2 = new THREE.Vector3();
const vector3 = new THREE.Vector3();
//load models 
const loader = new GLTFLoader().setPath( './models/' );



let physicsUniverse  = undefined;
let tmpTransformation = undefined;
const rigidBody_List = new Array();




///functions

//Ammo js physics
Ammo().then( AmmoStart );
function AmmoStart()
{
    tmpTransformation = new Ammo.btTransform();
    initPhysicsUniverse();
    initLevel();
    createDog(1 , new THREE.Vector3(1, 10, -3) , 1, null );       

    animate();
}

function initPhysicsUniverse()
{
    var collisionConfiguration  = new Ammo.btDefaultCollisionConfiguration();
    var dispatcher              = new Ammo.btCollisionDispatcher(collisionConfiguration);
    var overlappingPairCache    = new Ammo.btDbvtBroadphase();
    var solver                  = new Ammo.btSequentialImpulseConstraintSolver();
    physicsUniverse         = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    physicsUniverse.setGravity(new Ammo.btVector3(0, -75, 0));
}
function initLevel()
{
    loader.load( 'collision-world.glb', ( gltf ) => {

        const model = gltf.scene;
        scene.add( model );
    
        worldOctree.fromGraphNode( gltf.scene );
    
        gltf.scene.traverse( child => {
    
            if ( child.isMesh ) {
    
                child.castShadow = true;
                child.receiveShadow = true;
    
                if ( child.material.map ) {
    
                    child.material.map.anisotropy = 4;
    
                }
    
            }
    
        } );
    
        
        const helper = new OctreeHelper( worldOctree );
        helper.visible = false;
        scene.add( helper );
    
        const gui = new GUI( { width: 200 } );
        gui.add( { debug: false }, 'debug' )
            .onChange( function ( value ) {
    
                helper.visible = value;
    
            } );
    
        animate();
    
    } );
}
function createDog(scale , pos, mass, rot_quaternion)
{
    
    // ------ Graphics Universe ------  
    
    loader.load( 'shiba.glb', function ( gltf ) {
        var dog = gltf.scene;       
        dog.position.set(pos.x,pos.y,pos.z);                   
        scene.add( dog );
        animate();

        // ------ Physics Universe ------

        //collider shape
        let colShape = new Ammo.btCapsuleShape( scale * 0.5, scale * 1, scale* 0.5  );
        colShape.setMargin( 0.05 );

        createRigidbody(colShape, dog, pos, mass, rot_quaternion);

        
    } );
     
}

 //move to server?
function createRigidbody(structColShape, object, pos, mass, rot_quaternion)
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

     //default motion state
     let transform = new Ammo.btTransform();
     transform.setIdentity();
     transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
     transform.setRotation( new Ammo.btQuaternion( quaternion.x, quaternion.y, quaternion.z, quaternion.w ) );
     let defaultMotionState = new Ammo.btDefaultMotionState( transform );

   
    //inertia
     let localInertia = new Ammo.btVector3( 0, 0, 0 );
     structColShape.calculateLocalInertia( mass, localInertia );

    //rigidBody
     let RBody_Info = new Ammo.btRigidBodyConstructionInfo( mass, defaultMotionState, structColShape, localInertia );
     let RBody = new Ammo.btRigidBody( RBody_Info );

    //finalization
     physicsUniverse.addRigidBody( RBody ); 
     object.userData.physicsBody = RBody; 
     rigidBody_List.push(object);

   
}

 //move to server?
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




//Gampeplay 

 //move to server?
function throwBall() {

    const sphere = spheres[ sphereIdx ];

    camera.getWorldDirection( playerDirection );

    sphere.collider.center.copy( playerCollider.end ).addScaledVector( playerDirection, playerCollider.radius * 1.5 );

    // throw the ball with more force if we hold the button longer, and if we move forward

    const impulse = 15 + 30 * ( 1 - Math.exp( ( mouseTime - performance.now() ) * 0.001 ) );

    sphere.velocity.copy( playerDirection ).multiplyScalar( impulse );
    sphere.velocity.addScaledVector( playerVelocity, 2 );

    sphereIdx = ( sphereIdx + 1 ) % spheres.length;

}

 //move to server?
function playerCollisions() {

    const result = worldOctree.capsuleIntersect( playerCollider );

    playerOnFloor = false;

    if ( result ) {

        playerOnFloor = result.normal.y > 0;

        if ( ! playerOnFloor ) {

            playerVelocity.addScaledVector( result.normal, - result.normal.dot( playerVelocity ) );

        }

        playerCollider.translate( result.normal.multiplyScalar( result.depth ) );

    }

}
 //move to server?
function updatePlayer( deltaTime ) {

    let damping = Math.exp( - 4 * deltaTime ) - 1;

    if ( ! playerOnFloor ) {

        playerVelocity.y -= GRAVITY * deltaTime;

        // small air resistance
        damping *= 0.1;

    }

    playerVelocity.addScaledVector( playerVelocity, damping );

    const deltaPosition = playerVelocity.clone().multiplyScalar( deltaTime );
    playerCollider.translate( deltaPosition );

    playerCollisions();

    camera.position.copy( playerCollider.end );

}
 //move to server?
function playerSphereCollision( sphere ) {

    const center = vector1.addVectors( playerCollider.start, playerCollider.end ).multiplyScalar( 0.5 );

    const sphere_center = sphere.collider.center;

    const r = playerCollider.radius + sphere.collider.radius;
    const r2 = r * r;

    // approximation: player = 3 spheres

    for ( const point of [ playerCollider.start, playerCollider.end, center ] ) {

        const d2 = point.distanceToSquared( sphere_center );

        if ( d2 < r2 ) {

            const normal = vector1.subVectors( point, sphere_center ).normalize();
            const v1 = vector2.copy( normal ).multiplyScalar( normal.dot( playerVelocity ) );
            const v2 = vector3.copy( normal ).multiplyScalar( normal.dot( sphere.velocity ) );

            playerVelocity.add( v2 ).sub( v1 );
            sphere.velocity.add( v1 ).sub( v2 );

            const d = ( r - Math.sqrt( d2 ) ) / 2;
            sphere_center.addScaledVector( normal, - d );

        }

    }

}
 //move to server?
function spheresCollisions() {

    for ( let i = 0, length = spheres.length; i < length; i ++ ) {

        const s1 = spheres[ i ];

        for ( let j = i + 1; j < length; j ++ ) {

            const s2 = spheres[ j ];

            const d2 = s1.collider.center.distanceToSquared( s2.collider.center );
            const r = s1.collider.radius + s2.collider.radius;
            const r2 = r * r;

            if ( d2 < r2 ) {

                const normal = vector1.subVectors( s1.collider.center, s2.collider.center ).normalize();
                const v1 = vector2.copy( normal ).multiplyScalar( normal.dot( s1.velocity ) );
                const v2 = vector3.copy( normal ).multiplyScalar( normal.dot( s2.velocity ) );

                s1.velocity.add( v2 ).sub( v1 );
                s2.velocity.add( v1 ).sub( v2 );

                const d = ( r - Math.sqrt( d2 ) ) / 2;

                s1.collider.center.addScaledVector( normal, d );
                s2.collider.center.addScaledVector( normal, - d );

            }

        }

    }

}
 //move to server?
function updateSpheres( deltaTime ) {

    spheres.forEach( sphere => {

        sphere.collider.center.addScaledVector( sphere.velocity, deltaTime );

        const result = worldOctree.sphereIntersect( sphere.collider );

        if ( result ) {

            sphere.velocity.addScaledVector( result.normal, - result.normal.dot( sphere.velocity ) * 1.5 );
            sphere.collider.center.add( result.normal.multiplyScalar( result.depth ) );

        } else {

            sphere.velocity.y -= GRAVITY * deltaTime;

        }

        const damping = Math.exp( - 1.5 * deltaTime ) - 1;
        sphere.velocity.addScaledVector( sphere.velocity, damping );

        playerSphereCollision( sphere );

    } );

    spheresCollisions();

    for ( const sphere of spheres ) {

        sphere.mesh.position.copy( sphere.collider.center );

    }

}

function getForwardVector() {

    camera.getWorldDirection( playerDirection );
    playerDirection.y = 0;
    playerDirection.normalize();

    return playerDirection;

}

function getSideVector() {

    camera.getWorldDirection( playerDirection );
    playerDirection.y = 0;
    playerDirection.normalize();
    playerDirection.cross( camera.up );

    return playerDirection;

}

function controls( deltaTime ) {

    // gives a bit of air control
    const speedDelta = deltaTime * ( playerOnFloor ? 25 : 8 );

    if ( keyStates[ 'KeyW' ] ) {

        playerVelocity.add( getForwardVector().multiplyScalar( speedDelta ) );

    }

    if ( keyStates[ 'KeyS' ] ) {

        playerVelocity.add( getForwardVector().multiplyScalar( - speedDelta ) );

    }

    if ( keyStates[ 'KeyA' ] ) {

        playerVelocity.add( getSideVector().multiplyScalar( - speedDelta ) );

    }

    if ( keyStates[ 'KeyD' ] ) {

        playerVelocity.add( getSideVector().multiplyScalar( speedDelta ) );

    }

    if ( playerOnFloor ) {

        if ( keyStates[ 'Space' ] ) {

            playerVelocity.y = 15;

        }

    }

}


 //move to server?
function teleportPlayerIfOob() {

    if ( camera.position.y <= - 25 ) {

        playerCollider.start.set( 0, 0.35, 0 );
        playerCollider.end.set( 0, 1, 0 );
        playerCollider.radius = 0.35;
        camera.position.copy( playerCollider.end );
        camera.rotation.set( 0, 0, 0 );

    }

}


//rendering

function animate() {

    const deltaTime = Math.min( 0.05, clock.getDelta() ) / STEPS_PER_FRAME;

    //move to server?
    updatePhysicsUniverse( deltaTime );

    // we look for collisions in substeps to mitigate the risk of
    // an object traversing another too quickly for detection.

    for ( let i = 0; i < STEPS_PER_FRAME; i ++ ) {

        controls( deltaTime );

        //move to server?
        updatePlayer( deltaTime );

        updateSpheres( deltaTime );

        teleportPlayerIfOob();

    }

    renderer.render( scene, camera );

    stats.update();

    requestAnimationFrame( animate );

}

//event listeners
document.addEventListener( 'keydown', ( event ) => {

    keyStates[ event.code ] = true;

} );

document.addEventListener( 'keyup', ( event ) => {

    keyStates[ event.code ] = false;

} );

container.addEventListener( 'mousedown', () => {

    document.body.requestPointerLock();

    mouseTime = performance.now();

} );

document.addEventListener( 'mouseup', () => {

    if ( document.pointerLockElement !== null ) throwBall();

} );

document.body.addEventListener( 'mousemove', ( event ) => {

    if ( document.pointerLockElement === document.body ) {

        camera.rotation.y -= event.movementX / 500;
        camera.rotation.x -= event.movementY / 500;

    }

} );

window.addEventListener( 'resize', onWindowResize );

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}