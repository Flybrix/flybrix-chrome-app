function initialize_vehicle_view() {
    eeprom_refresh_callback_list.add(refresh_vehicle_view_from_eepromConfig);
    refresh_vehicle_view_from_eepromConfig();
};

function refresh_vehicle_view_from_eepromConfig(){
    // nothing yet
};

(function() {
    'use strict';

    var vehicleController = function($scope, $rootScope, $timeout) {

        var magnetometer_estimate = [0, 0, 0, 0];
        var magnetometer_estimate_points = [];

        var vertexShaderGLSL = [
            'void main() {',
            '    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
            '    gl_PointSize = 2.0;',
            '    gl_Position = projectionMatrix * mvPosition;',
            '}',
        ].join("\n");

        var fragmentShaderGLSL = [
            'uniform vec3 color;',
            'void main() {',
            '    gl_FragColor = vec4(color, 1.0 );',
            '}',
        ].join("\n");

        // standard global variables
        var vehicle_view_container, vehicle_view_scene, vehicle_view_camera, vehicle_view_renderer, vehicle_view_controls, vehicle_view_stats;
        // custom global variables
        var vehicle_view_prism;
        var vehicle_view_sphere;

        var vehicle_view_pointcloud_geometry;
        var vehicle_view_points;
        var vehicle_view_points_index = 0;
        var MAX_POINTS = 10000;

        function create_vehicle_view_scene() {
            vehicle_view_scene = new THREE.Scene();
            var SCREEN_WIDTH = 800, SCREEN_HEIGHT = 500;

            // camera attributes
            var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
            vehicle_view_camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
            // add the camera to the scene
            vehicle_view_scene.add(vehicle_view_camera);  // the camera defaults to position (0,0,0)
            vehicle_view_camera.position.set(0, 0, 400);
            vehicle_view_camera.lookAt(vehicle_view_scene.position);

            vehicle_view_renderer = new THREE.WebGLRenderer({antialias: true});
            vehicle_view_renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
            $('#vehicle_scene').append(vehicle_view_renderer.domElement);

            // move mouse and: left   click to rotate,
            //                 middle click to zoom,
            //                 right  click to pan
            vehicle_view_controls = new THREE.OrbitControls(vehicle_view_camera, vehicle_view_renderer.domElement);

            // displays current and past frames per second attained by scene
            vehicle_view_stats = new Stats();
            vehicle_view_stats.setMode(0);  // 0: fps, 1: ms, 2: mb
            vehicle_view_stats.domElement.style.position = 'absolute';
            vehicle_view_stats.domElement.style.bottom = '0px';
            vehicle_view_stats.domElement.style.zIndex = 100;
            $('#vehicle_scene').append(vehicle_view_stats.domElement);

            // create a light
            var light = new THREE.PointLight(0xffffff);
            light.position.set(0, 0, 400);
            vehicle_view_scene.add(light);
            vehicle_view_scene.add(new THREE.AmbientLight(0x303030));

            // build text-labelled faces for our rectangular prism
            var modelMaterial = new THREE.MeshPhongMaterial({color: 0xAAAAAA, specular: 0x111111, shininess: 200});
            var loader = new THREE.STLLoader();
            loader.load('./models/flyer_assembly_xquad_small.stl', function(geometry) {
                var vehicle_mesh = new THREE.Mesh(geometry, modelMaterial);
                vehicle_mesh.position.set(-24, -20, 16);
                vehicle_mesh.rotation.y = Math.PI / 2;
                vehicle_mesh.castShadow = true;
                vehicle_mesh.receiveShadow = true;
                vehicle_view_prism = new THREE.Object3D();
                vehicle_view_prism.position.set(0, 0, 0);
                vehicle_view_prism.add(vehicle_mesh);
                vehicle_view_scene.add(vehicle_view_prism);
            });

            // create a set of coordinate axes to help orient user
            // The X axis is red. The Y axis is green. The Z axis is blue.
            var axes = new THREE.AxisHelper(150);
            vehicle_view_scene.add(axes);

            vehicle_view_sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({color: 0xFF3030, opacity: 0.5, transparent: true}));
            vehicle_view_sphere.scale.set(1, 1, 1);
            vehicle_view_scene.add(vehicle_view_sphere);

            magnetometer_estimate_points = [];

            /*
            var dir = new THREE.Vector3( 0, 1, 0 );
            var origin = new THREE.Vector3( 0, 0, 0 );
            var length = 200;
            var hex = 0x000000;
            var arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
            vehicle_view_scene.add( arrowHelper );
            */

            // draw dots showing the magnetic field projection
            // all the points start at (0,0,0) -- conveniently inside the prism

            vehicle_view_points = new Float32Array(MAX_POINTS * 3);
            for (var i = 0; i < MAX_POINTS; i++) {
                vehicle_view_points[i * 3 + 0] = 0;
                vehicle_view_points[i * 3 + 1] = 0;
                vehicle_view_points[i * 3 + 2] = 0;
            }
            vehicle_view_points_index = 0;

            vehicle_view_pointcloud_geometry = new THREE.BufferGeometry();
            vehicle_view_pointcloud_geometry.addAttribute('position', new THREE.BufferAttribute(vehicle_view_points, 3).setDynamic(true));

            var material = new THREE.ShaderMaterial({
                uniforms: {
                    color: {type: "c", value: new THREE.Color(0xff0000)},
                },
                vertexShader: vertexShaderGLSL,
                fragmentShader: fragmentShaderGLSL,
            });
            var particles = new THREE.Points(vehicle_view_pointcloud_geometry, material);
            vehicle_view_scene.add(particles);
        }

        function animate_vehicle_view_scene() {
            vehicle_view_stats.begin();
            requestAnimationFrame(animate_vehicle_view_scene);
            vehicle_view_renderer.render(vehicle_view_scene, vehicle_view_camera);
            vehicle_view_stats.end();
        }

        function update_vehicle_view_scene(state) {
            var pitch = state.kinematicsAngle[0];
            var roll = state.kinematicsAngle[1];
            var yaw = state.kinematicsAngle[2];
            var magx = state.mag[0] + eepromConfig.magBias[0];
            var magy = state.mag[1] + eepromConfig.magBias[1];
            var magz = state.mag[2] + eepromConfig.magBias[2];

            // change to three.js coordinate system
            // The X axis is red. The Y axis is green. The Z axis is blue.
            vehicle_view_prism.rotation.x = -pitch;
            vehicle_view_prism.rotation.y = yaw;
            vehicle_view_prism.rotation.z = roll;
            vehicle_view_prism.rotation.order = 'YZX';
            vehicle_view_controls.update();
            vehicle_view_stats.update();

            var magscale = 5;
            vehicle_view_points[vehicle_view_points_index * 3 + 0] = magx / magscale;
            vehicle_view_points[vehicle_view_points_index * 3 + 1] = magy / magscale;
            vehicle_view_points[vehicle_view_points_index * 3 + 2] = magz / magscale;

            vehicle_view_pointcloud_geometry.attributes.position.updateRange.offset = vehicle_view_points_index * 3;
            vehicle_view_pointcloud_geometry.attributes.position.updateRange.count = (vehicle_view_points_index + 1) * 3;
            vehicle_view_pointcloud_geometry.attributes.position.needsUpdate = true;

            magnetometer_estimate_points.push([magx, magy, magz]);

            vehicle_view_points_index++;

            if (vehicle_view_points_index == MAX_POINTS) {
                vehicle_view_points_index = 0;
            }
        }

        $scope.adjustMagnetometerEstimate = function() {
            var pointLimit = 500;
            if (magnetometer_estimate_points.length > pointLimit)
                magnetometer_estimate_points = magnetometer_estimate_points.slice(-pointLimit);
            for (var i = 0; i < 10000; ++i) {
                magnetometer_estimate = sphereMinimize(magnetometer_estimate, magnetometer_estimate_points);
                var iterate = magnetometer_estimate.improved;
                magnetometer_estimate = magnetometer_estimate.value;
                if (magnetometer_estimate[3] < 1e-3)
                    magnetometer_estimate[3] = 1e-3;
                if (!iterate)
                    break;
            }
            var magscale = 5;
            vehicle_view_sphere.position.set(magnetometer_estimate[0] / magscale, magnetometer_estimate[1] / magscale, magnetometer_estimate[2] / magscale);
            var scaling = (magnetometer_estimate[3] < 1e-3) ? 1e-3 : (magnetometer_estimate[3] / magscale);
            vehicle_view_sphere.scale.set(scaling, scaling, scaling);
        };

        $scope.applyBiasFix = function() {
            eepromConfig.magBias = magnetometer_estimate.slice(0, 3).map(function(v) {
                return -v;
            });
            refresh_config_view_from_eepromConfig();
            $timeout(function() {
                sendCONFIG();
                $timeout(eeprom_refresh_callback_list.fire, 100);
            }, 1);
        };

        var last_time = new Date();
        $rootScope.$watch('state', function(state) {
            if (state === undefined)
                return;
            var new_time = new Date();
            if (new_time - last_time < graph_update_delay)
                return;
            last_time = new_time;
            if (!$scope.drawVehicle)
                return;
            update_vehicle_view_scene(state);

            $scope.vehicleSignalLights.forEach(function(v) {
                v.off = !(state.status & v.mask);
            });
        });

        $scope.drawVehicle = false;
        $scope.vehicleSignalLights = [
            {mask: 1 << 0, label: 'BOOT', off: true},
            {mask: 1 << 1, label: 'MPU FAIL', off: true},
            {mask: 1 << 2, label: 'BMP FAIL', off: true},
            {mask: 1 << 3, label: 'RX FAIL', off: true},
            {mask: 1 << 4, label: 'IDLE', off: true},
            {mask: 1 << 5, label: 'ENABLING', off: true},
            {mask: 1 << 6, label: 'CLEAR MPU BIAS', off: true},
            {mask: 1 << 7, label: 'SET MPU BIAS', off: true},
            {mask: 1 << 8, label: 'STABILITY FAIL', off: true},
            {mask: 1 << 9, label: 'ANGLE FAIL', off: true},
            {mask: 1 << 10, label: 'ENABLED', off: true},
            {mask: 1 << 11, label: 'LOW BATTERY', off: true},
            {mask: 1 << 12, label: 'TEMP WARNING', off: true},
            {mask: 1 << 13, label: 'LOG IS FULL', off: true},
            {mask: 1 << 14, label: 'UNPAIRED', off: true},
            {mask: 1 << 15, label: 'OVERRIDE', off: true},
        ];

        create_vehicle_view_scene();
        animate_vehicle_view_scene();
    };

    var app = angular.module('flybrixApp');

    app.controller('vehicleController', ['$scope', '$rootScope', '$timeout', vehicleController]);
}());
