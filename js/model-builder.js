(function() {
    'use strict';

    var modelBuilder = function() {
        var files = {
            plate2x4: '3020 (2x4 plate) solid.STL',
            flat2x2: '3068 (2x2 flat tile) solid.STL',
            plate1x8: '3460 (1x8 plate) solid.STL',
            plate1x3: '3623 (1x3 plate) solid.STL',
            plate1x6: '3666 (1x6 plate) solid.STL',
            plate1x4: '3710 (1x4 plate) solid.STL',
            windshield: '3823 (windshield) solid.STL',
            rudder: '44661 (rudder 2x3x2) solid.STL',
            plate1x12: '60479 (1x12 plate) solid.STL',
            round: '6141 (1x1 round) solid.STL',
            frame: '64799 (4x4 frame plate) solid.STL',
            hinge1: '73983 bottom (2x2 hinge) solid.STL',
            hinge2: '73983 top (2x2 hinge) solid.STL',
            plate2knobs: '92593 (1x4 plate with 2 knobs) solid.STL',
        };

        var parts = {};
        var loader = new THREE.STLLoader();
        var defaultMaterial = new THREE.MeshPhongMaterial({
            color: 0xAAAAAA,
            specular: 0x111111,
            shininess: 200,
        });

        Object.keys(files).forEach(function(key) {
            loader.load('./models/parts/' + files[key], function(geometry) {
                parts[key] = geometry;
            });
        });

        function build(structure) {
            var mesh;
            if (('part' in structure) && (structure.part in parts)) {
                mesh = new THREE.Mesh(parts[structure.part], defaultMaterial);
            } else {
                mesh = new THREE.Object3D();
            }
            if ('position' in structure) {
                var pos = structure.position;
                if ('x' in pos && 'y' in pos && 'z' in pos) {
                    mesh.position.set(pos.x * 8.0, pos.y * 3.2, pos.z * 8.0);
                }
            }
            if ('rotation' in structure) {
                mesh.rotation.y = structure.rotation * Math.PI / 180.0;
            }
            if ('children' in structure) {
                structure.children.forEach(function(val) {
                    mesh.add(build(val));
                });
            }
            return mesh;
        }

        return {
            build: build,
        };
    };

    angular.module('flybrixApp').factory('modelBuilder', modelBuilder);
}());
