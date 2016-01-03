var turf = require('turf'),
  _ = require('underscore'),
  OSRM = require('osrm');


module.exports = {
  /**
   * Calculate an array of drivetime isochrones around a given point
   *
   * @param  {GeoJSON Point} origin {Array} times {String} network
   * @return {Array}
   */

  isochrones: function(origin_latlng,times,network,options, callback) {
    _.defaults(options,{maxspeed : 90, resolution : 25, unit : 'kilometers', exclude : false } );
    var osrm = network instanceof OSRM ? network : new OSRM(network);
    var spokes = turf.featurecollection([]);
    var longest = Math.max.apply(Math, times);
    var length = (longest/60) * options.maxspeed;
    var valid_points = new Array(times.length);
    var origin = turf.point(origin_latlng);
    spokes.features.push(turf.destination(origin, length, 180, options.unit));
    spokes.features.push(turf.destination(origin, length, 0, options.unit));
    spokes.features.push(turf.destination(origin, length, 90, options.unit));
    spokes.features.push(turf.destination(origin, length, -90, options.unit));


    var bbox = turf.extent(spokes);
    var sizeCellGrid = turf.distance(turf.point([bbox[0], bbox[1]]), turf.point([bbox[0], bbox[3]]), options.unit) / options.resolution;

    //compute destination grid
    var targets = turf.pointGrid(bbox, sizeCellGrid, options.unit);

    //The intial grid of points is square but we really only want a radius
    targets.features = targets.features.filter(function(feat) {
        return turf.distance(turf.point([feat.geometry.coordinates[0], feat.geometry.coordinates[1]]), origin, options.unit) <= length;
    });

    //Exclude points that fall within the exclusion polygon (like those in water)
    if(options.exclude) {
      targets.features = targets.features.filter(function(feat) {
          return !turf.inside(feat,options.exclude);
      });
    }

    var points = {
        sources: [[origin.geometry.coordinates[0],origin.geometry.coordinates[1]]],
        destinations: []
    };
    points.destinations = targets.features.map(function (point){
      return [point[0],point[1]];
    });
    osrm.table(points, function(err, table) {
        if(err) callback(err);

        for (i = 0; i < table.distance_table[0].length; i++) { 
          for (j = 0; j < times.length; j++){
            if (table.distance_table[0][i] <= times[j]){
              valid_points[j].push(table.destination_coodinates[i]);
            }
          }
        }
        var poly = turf.concave(valid_points, 0.5, options.unit);
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