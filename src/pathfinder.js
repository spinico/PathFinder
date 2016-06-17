/* global angular */

angular.module('pathFinderDemo', [])
    .service('pathFinderService', [ function(){

        var PathFinder = this;

        var distances = [
            [ 0, 7, 4,10,10],
            [ 7, 0, 6, 7, 1],
            [ 4, 6, 0,16, 2],
            [10, 7, 16,0, 6],
            [10, 1, 2, 6, 0]
        ];

        PathFinder.getTimeMatrix = function(speed){
            var matrix = [];

            for (var i = 0; i < distances.length; i++) {
                var row = [];
                for (var j = 0; j < distances.length; j++) {
                    row.push(distances[i][j] / speed);
                }
                matrix.push(row);
            }

            return matrix;
        }

    }])
    .controller('pathFinderController', ['$scope', 'pathFinderService', function($scope, pathFinderService) {

        $scope.matrix = null;

        var pathFinder = pathFinderService;

        $scope.update = function(start, speed, maxTime) {
            $scope.matrix = pathFinder.getTimeMatrix(speed);
        };

        $scope.data = {
            maxTime: 4,

            Speeds: [
                {id: '1', value: '3'},
                {id: '2', value: '5'}
            ],
            speed: {id:'1', value: '3'},

            Points: [
                {id: '1', value: 'A'},
                {id: '2', value: 'B'},
                {id: '3', value: 'C'},
                {id: '4', value: 'D'},
                {id: '5', value: 'E'}
            ],
            start: {id:'2', value: 'B'}
        };

    }]);