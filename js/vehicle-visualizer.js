(function() {
    'use strict';

    var vehicleVisualizer = function($rootScope) {
        var POINT_LIMIT = 1000;
        var MAG_SCALE = 5;

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

        function link(scope, element, attrs) {
            var SCREEN_WIDTH = 1, SCREEN_HEIGHT = 1;
            var VIEW_ANGLE = 45, ASPECT = 1, NEAR = 0.1, FAR = 20000;

            var vehicleViewScene = new THREE.Scene();
            var vehicleViewCamera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);

            vehicleViewScene.add(vehicleViewCamera);
            vehicleViewCamera.position.set(0, 0, 400);
            vehicleViewCamera.lookAt(vehicleViewScene.position);

            var vehicleViewRenderer = new THREE.WebGLRenderer({
                antialias: true,
            });

            function applyWindowSize() {
                ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT;
                vehicleViewCamera.aspect = ASPECT;
                vehicleViewCamera.updateProjectionMatrix();
                vehicleViewRenderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
                console.log(SCREEN_WIDTH, SCREEN_HEIGHT);
            };

            scope.$watch(attrs.screenHeight, function(height) {
                SCREEN_HEIGHT = Math.max(height, 1);
                applyWindowSize();
            });

            scope.$watch(attrs.screenWidth, function(width) {
                SCREEN_WIDTH = Math.max(width, 1);
                applyWindowSize();
            });

            element.append(vehicleViewRenderer.domElement);

            // Camera controls
            var vehicleViewControls = new THREE.OrbitControls(vehicleViewCamera, vehicleViewRenderer.domElement);

            // Stats display
            var vehicleViewStats = new Stats();
            vehicleViewStats.setMode(0);  // 0: fps, 1: ms, 2: mb
            vehicleViewStats.domElement.style.position = 'absolute';
            vehicleViewStats.domElement.style.bottom = '0px';
            vehicleViewStats.domElement.style.zIndex = 100;
            element.append(vehicleViewStats.domElement);

            // Ambient light
            var light = new THREE.PointLight(0xffffff);
            light.position.set(0, 0, 400);
            vehicleViewScene.add(light);
            vehicleViewScene.add(new THREE.AmbientLight(0x303030));

            // Axes displayed at the coordinate center
            vehicleViewScene.add(new THREE.AxisHelper(150));

            var vehicleBaseCoordinates = new THREE.Object3D();
            vehicleBaseCoordinates.position.set(0, 0, 0);
            vehicleViewScene.add(vehicleBaseCoordinates);

            // Robot model
            var modelMaterial = new THREE.MeshPhongMaterial({
                color: 0xAAAAAA,
                specular: 0x111111,
                shininess: 200,
            });
            var loader = new THREE.STLLoader();
            loader.load('./models/flyer_assembly_xquad_small.STL', function(geometry) {
                var vehicleMesh = new THREE.Mesh(geometry, modelMaterial);
                vehicleMesh.position.set(-24, -20, 16);
                vehicleMesh.rotation.y = Math.PI / 2;
                vehicleMesh.castShadow = true;
                vehicleMesh.receiveShadow = true;
                vehicleBaseCoordinates.add(vehicleMesh);
            });

            var magnetometerData = new THREE.Object3D();
            magnetometerData.position.set(0, 0, 0);
            vehicleViewScene.add(magnetometerData);

            var magnetometerEstimateSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({
                color: 0xFF3030,
                opacity: 0.5,
                transparent: true,
            }));
            magnetometerEstimateSphere.scale.set(1, 1, 1);
            magnetometerData.add(magnetometerEstimateSphere);

            var magnetometerPoints = new Float32Array(POINT_LIMIT * 3);
            magnetometerPoints.forEach(function(val, idx) {
                magnetometerPoints[idx] = 0;
            });
            var magnetometerLastPoint = 0;

            var magnetometerPointcloud = new THREE.BufferGeometry();
            magnetometerPointcloud.addAttribute('position', new THREE.BufferAttribute(magnetometerPoints, 3).setDynamic(true));

            var particleMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    color: {type: "c", value: new THREE.Color(0xff0000)},
                },
                vertexShader: vertexShaderGLSL,
                fragmentShader: fragmentShaderGLSL,
            });
            var particles = new THREE.Points(magnetometerPointcloud, particleMaterial);
            magnetometerData.add(particles);

            scope.$watch(attrs.state, function(state) {
                if (!drawVehicle || state === undefined || $rootScope.eepromConfig === undefined)
                    return;
                var pitch = state.kinematicsAngle[0];
                var roll = state.kinematicsAngle[1];
                var yaw = state.kinematicsAngle[2];

                // change to three.js coordinate system
                // The X axis is red. The Y axis is green. The Z axis is blue.
                vehicleBaseCoordinates.rotation.x = -pitch;
                vehicleBaseCoordinates.rotation.y = yaw;
                vehicleBaseCoordinates.rotation.z = roll;
                vehicleBaseCoordinates.rotation.order = 'YZX';

                var magx = state.mag[0] + $rootScope.eepromConfig.magBias[0];
                var magy = state.mag[1] + $rootScope.eepromConfig.magBias[1];
                var magz = state.mag[2] + $rootScope.eepromConfig.magBias[2];

                magnetometerPoints[magnetometerLastPoint * 3 + 0] = magx / MAG_SCALE;
                magnetometerPoints[magnetometerLastPoint * 3 + 1] = magy / MAG_SCALE;
                magnetometerPoints[magnetometerLastPoint * 3 + 2] = magz / MAG_SCALE;

                magnetometerPointcloud.attributes.position.updateRange.offset = magnetometerLastPoint * 3;
                magnetometerPointcloud.attributes.position.updateRange.count = (magnetometerLastPoint + 1) * 3;
                magnetometerPointcloud.attributes.position.needsUpdate = true;

                if (++magnetometerLastPoint === POINT_LIMIT)
                    magnetometerLastPoint = 0;
            });

            var drawVehicle = false;

            scope.$watch(attrs.magnetSphere, function(magnetSphere) {
                if (magnetSphere === undefined) {
                    magnetometerEstimateSphere.visible = false;
                    return;
                }
                magnetometerEstimateSphere.visible = true;

                magnetometerEstimateSphere.position.set(magnetSphere.position.x / MAG_SCALE, magnetSphere.position.y / MAG_SCALE, magnetSphere.position.z / MAG_SCALE);
                var scaling = (magnetSphere.scale < 1e-3) ? 1e-3 : (magnetSphere.scale / MAG_SCALE);
                magnetometerEstimateSphere.scale.set(scaling, scaling, scaling);
            });

            scope.$watch(attrs.draw, function(draw) {
                drawVehicle = draw;
            });

            function render() {
                vehicleViewStats.begin();
                vehicleViewRenderer.render(vehicleViewScene, vehicleViewCamera);
                vehicleViewStats.end();
                requestAnimationFrame(render);
            };

            render();
        }

        return {
            scope: true,
            priority: 1,
            link: link,
        };
    };

    var vehiclePreview = function($http, modelBuilder) {
        function link(scope, element, attrs, ngModel) {
            var SCREEN_WIDTH = 1, SCREEN_HEIGHT = 1;
            var VIEW_ANGLE = 45, ASPECT = 1, NEAR = 0.1, FAR = 20000;

            var vehicleViewScene = new THREE.Scene();
            var vehicleViewCamera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);

            vehicleViewScene.add(vehicleViewCamera);
            vehicleViewCamera.position.set(0, 0, 400);
            vehicleViewCamera.lookAt(vehicleViewScene.position);

            var vehicleViewRenderer = new THREE.WebGLRenderer({
                antialias: true,
            });

            function applyWindowSize() {
                ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT;
                vehicleViewCamera.aspect = ASPECT;
                vehicleViewCamera.updateProjectionMatrix();
                vehicleViewRenderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
                console.log(SCREEN_WIDTH, SCREEN_HEIGHT);
            };

            scope.$watch(attrs.screenHeight, function(height) {
                SCREEN_HEIGHT = Math.max(height, 1);
                applyWindowSize();
            });

            scope.$watch(attrs.screenWidth, function(width) {
                SCREEN_WIDTH = Math.max(width, 1);
                applyWindowSize();
            });

            element.append(vehicleViewRenderer.domElement);

            // Camera controls
            var vehicleViewControls = new THREE.OrbitControls(vehicleViewCamera, vehicleViewRenderer.domElement);

            // Ambient light
            var light = new THREE.PointLight(0xffffff);
            light.position.set(0, 0, 400);
            vehicleViewScene.add(light);
            vehicleViewScene.add(new THREE.AmbientLight(0x303030));


            var vehicleBaseCoordinates = new THREE.Object3D();
            vehicleBaseCoordinates.position.set(0, 0, 0);
            vehicleViewScene.add(vehicleBaseCoordinates);

            // Robot model
            var modelMaterial = new THREE.MeshPhongMaterial({
                color: 0xAAAAAA,
                specular: 0x111111,
                shininess: 200,
            });

            function render() {
                vehicleViewRenderer.render(vehicleViewScene, vehicleViewCamera);
                requestAnimationFrame(render);
            };

            render();

            ngModel.$render = function() {
                console.log('DRAWING FOR', ngModel.$modelValue);
                if (ngModel.$modelValue === undefined)
                    return;
                while (vehicleBaseCoordinates.children.length > 0)
                    vehicleBaseCoordinates.remove(vehicleBaseCoordinates.children[0]);
                $http.get(ngModel.$modelValue).then(function(retval) {
                    vehicleBaseCoordinates.add(modelBuilder.build(angular.fromJson(retval.data)));
                });
            }
        }

        return {
            scope: true,
            priority: 1,
            require: 'ngModel',
            link: link,
        };
    };

    var app = angular.module('flybrixApp');

    app.directive('vehicleVisualizer', ['$rootScope', vehicleVisualizer]);

    app.directive('vehiclePreview', ['$http', 'modelBuilder', vehiclePreview]);
}());
