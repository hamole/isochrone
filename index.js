var turf = require('turf'),
  _ = require('underscore'),
  OSRM = require('osrm'),
  hull = require('hull.js');


module.exports = {
  /**
   * Calculate an array of drivetime isochrones around a given point
   *
   * @param  {GeoJSON Point} origin {Array} times {String} network
   * @return {Array}
   */

  isochrones: function(origin_latlng,times,osrm,options, callback) {
    _.defaults(options,{maxspeed : 60, resolution : 25, unit : 'kilometers', exclude : false } );
    if(options.resolution > 50){
      options.resolution = 50;
    }
    var spokes = turf.featurecollection([]);
    var longest = Math.max.apply(Math, times);
    var length = (longest/3600) * options.maxspeed;
    var valid_points = new Array(times.length);
    var origin = turf.point(origin_latlng);
    spokes.features.push(turf.destination(origin, length, 180, options.unit));
    spokes.features.push(turf.destination(origin, length, 0, options.unit));
    spokes.features.push(turf.destination(origin, length, 90, options.unit));
    spokes.features.push(turf.destination(origin, length, -90, options.unit));


    var bbox = turf.extent(spokes);
    var sizeCellGrid = turf.distance(turf.point([bbox[0], bbox[1]]), turf.point([bbox[0], bbox[3]]), options.unit) / options.resolution;

    var points = {
        sources: [[origin.geometry.coordinates[1],origin.geometry.coordinates[0]]],
        destinations: []
    };

    //compute destination grid
    var targets = turf.pointGrid(bbox, sizeCellGrid, options.unit);

    for (var i = 0; i < targets.features.length; i++){
      if (turf.distance(turf.point([targets.features[i].geometry.coordinates[0], targets.features[i].geometry.coordinates[1]]), origin, options.unit) <= length){
        //if(!turf.inside(targets.features[i],options.exclude)) {
          points.destinations.push([targets.features[i].geometry.coordinates[1],targets.features[i].geometry.coordinates[0]]);
       // }
      }
    }

    osrm.table(points, function(err, table) {
        if(err) {
          callback(err);
          return;
        }
        for (var i = 0; i < valid_points.length; i++){
          valid_points[i] = [];
        }
        for (var i = 0; i < table.distance_table[0].length; i++) { 
          for (var j = 0; j < times.length; j++){
            if (table.distance_table[0][i]/10 <= times[j]){
              valid_points[j].push([table.destination_coordinates[i][1],table.destination_coordinates[i][0]]);
            }
          }
        }
        
        //var fc = turf.featurecollection([]);
        var hull_points = [];
        for (var i = 0; i < valid_points[0].length; i++) {
          hull_points.push([valid_points[0][i][0],valid_points[0][i][1]]);
          //fc.features.push(turf.point([valid_points[0][i][0],valid_points[0][i][1]]));
        } 
        //var poly = turf.buffer(turf.concave(fc,sizeCellGrid*2,options.unit),sizeCellGrid/2,options.unit);
        var poly = turf.buffer(hull(hull_points,20),sizeCellGrid/2,options.unit);
        callback(err, poly);
    });
  },

  /**
   * Unescape special characters in the given string of html.
   *
   * @param  {String} html
   * @return {String}
   */
 
};