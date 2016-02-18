var sphereMinimize = (function() {
    'use strict';

    function iterate(x, weight, f, df, subdivisions) {
        var dx = df.map(function(dfi) {
            return dfi(x);
        });
        var new_weight = weight / Math.sqrt(dx.reduce(function(acc, v) {
            return acc + v * v;
        }, 0));
        var x_new = dx.map(function(dxi, idx) {
            return x[idx] - new_weight * dxi;
        });
        if (f(x_new) < f(x))
            return {
                value: x_new, improved: true,
            }
        if (subdivisions <= 0)
            return {
                value: x, improved: false,
            }
        return iterate(x, weight / 2, f, df, subdivisions - 1);
    };

    function sphere_error_base(x, point) {
        return Math.pow(point[0] - x[0], 2) + Math.pow(point[1] - x[1], 2) + Math.pow(point[2] - x[2], 2) - Math.pow(x[3], 2);
    }

    function iterate_sphere(x, points) {
        return iterate(
            x, 1.0,
            function(p) {
                return points.reduce(function(acc, point) {
                    return acc + Math.pow(sphere_error_base(p, point), 2);
                }, 0);
            },
            [
              function(p) {
                  return points.reduce(function(acc, point) {
                      return acc + 4 * (p[0] - point[0]) * sphere_error_base(p, point);
                  }, 0);
              },
              function(p) {
                  return points.reduce(function(acc, point) {
                      return acc + 4 * (p[1] - point[1]) * sphere_error_base(p, point);
                  }, 0);
              },
              function(p) {
                  return points.reduce(function(acc, point) {
                      return acc + 4 * (p[2] - point[2]) * sphere_error_base(p, point);
                  }, 0);
              },
              function(p) {
                  return points.reduce(function(acc, point) {
                      return acc + -4 * p[3] * sphere_error_base(p, point);
                  }, 0);
              }
            ],
            4);
    }

    return iterate_sphere;
}());
