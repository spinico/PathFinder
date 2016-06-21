/* global angular */

angular.module('pathFinderDemo', [])
    .value('data', {
        maxTime: 4,

        Distances:[
            [ 0, 7, 4,10,10],
            [ 7, 0, 6, 7, 1],
            [ 4, 6, 0,16, 2],
            [10, 7, 16,0, 6],
            [10, 1, 2, 6, 0]
        ],

        Speeds: [
            {id: '0', value: '3'},
            {id: '1', value: '5'}
        ],
        speed: {id:'0', value: '3'},

        Points: [
            {id: '0', value: 'A'},
            {id: '1', value: 'B'},
            {id: '2', value: 'C'},
            {id: '3', value: 'D'},
            {id: '4', value: 'E'}
        ],
        start: {id:'4', value: 'E'}
    })
    .controller('pathFinderController', ['$scope', 'data', 'pathFinderService',
        function($scope, data, pathFinderService) {

        $scope.data = data;
        $scope.matrix = null;
        $scope.MST = null; // Minimum spanning tree
        $scope.ODV = null; // Odd Degree Vertex
        $scope.MME = null; // Minimum Matching Edges
        $scope.circuit = null; // Approx circuit

        var pathFinder = pathFinderService;

        $scope.updateTimeMatrix = function(speed) {
            $scope.matrix = pathFinder.getTimeMatrix($scope.data.Distances, speed);
        };

        $scope.evaluate = function(start)
        {
            $scope.MST = pathFinder.getMinimumSpanningTree(start.id, $scope.data.Distances);

            $scope.ODV = pathFinder.getOddDegreeVertex($scope.data.Points, $scope.MST);

            $scope.MME = pathFinder.getMinimumMatchingEdges($scope.ODV, $scope.data.Distances);

            $scope.circuit = pathFinder.getCircuit($scope.MST, $scope.MME);
        };

    }])
    .service('pathFinderService', [ function(){

        var PathFinder = this;

        PathFinder.getTimeMatrix = function(distances, speed){
            var matrix = [];

            for (var i = 0; i < distances.length; i++) {
                var row = [];
                for (var j = 0; j < distances.length; j++) {
                    row.push(distances[i][j] / speed);
                }
                matrix.push(row);
            }

            return matrix;
        };

        PathFinder.getMinimumSpanningTree = function(start, distances){

            var length = distances.length;
            var A = [];
            var MST = [];

            if (length > 0)
            {
                // Default start point (arbitrary)
                A.push(Number(start));

                for (var i = 0; i < length; i++)
                {
                    var edge = findNextEdge(A, distances);

                    if (edge != null)
                    {
                        A.push(edge.destination);
                        MST.push({
                            source: edge.source,
                            destination: edge.destination
                        });
                    }
                }
            }

            return MST;
        };

        function findNextEdge(A, distances)
        {
            var edge = null;
            var minimum = -1;

            // Look for shortest distance from available source point
            for(var i=0; i < A.length; i++)
            {
                var source = A[i];

                for(var j=0; j < distances.length; j++)
                {
                    // No cycle condition
                    if (A.indexOf(j) === -1 && source != j)
                    {
                        // Update on a new minimum distance
                        if (minimum === -1 || distances[source][j] < minimum)
                        {
                            minimum = distances[source][j];

                            edge = {
                                source: source,
                                destination: j
                            };
                        }
                    }
                }
            }

            return edge;
        }

        PathFinder.getOddDegreeVertex = function(points, MST)
        {
            var ODV = [];
            var size = points.length;

            var degree = getVertexDegree(size, MST);

            for(var i = 0; i < degree.length; i++)
            {
                // Finding odd degree vertex
                if (degree[i] % 2)
                {
                    ODV.push(i);
                }
            }

            return ODV;
        };

        function getVertexDegree(size, MST)
        {
            var degree = [];

            // Initialize to degree 0
            for(var i = 0; i < size; i++)
            {
                degree.push(0);
            }

            for(var j = 0; j < MST.length; j++)
            {
                degree[MST[j].source]++;
                degree[MST[j].destination]++;
            }

            return degree;
        }

        PathFinder.getMinimumMatchingEdges = function(ODV, matrix)
        {
            var MME = [];
            var A = []; // List of already processed

            for (var i = 0; i < ODV.length; i++) {
                var source = ODV[i];
                var minimum = -1;
                var destination = null;

                for (var j = 0; j < ODV.length; j++)
                {
                    // Do not process the same odd degree vertex
                    if (A.indexOf(i) === -1 && A.indexOf(j) === -1 && i !== j)
                    {
                        if (minimum === -1 || matrix[source][ODV[j]] < minimum)
                        {
                            destination = ODV[j];
                            minimum = matrix[source][destination];
                        }
                    }
                }

                if (destination != null) {
                    MME.push({
                        source: source,
                        destination: destination
                    });

                    A.push(source);
                    A.push(destination);
                }
            }


            return MME;
        };

        PathFinder.getCircuit = function(MST, MME)
        {
            var circuit = [];

            // Merge MST and MME
            for(var i=0; i<MST.length; i++)
            {
                var edge = MST[i];
                var found = false;

                for(var j=0; j<MME.length; j++)
                {
                    if ((edge.source === MME[j].source &&
                         edge.destination === MME[j].destination) ||
                         edge.source === MME[j].destination &&
                         edge.destination === MME[j].source)
                    {
                        found = true;
                    }
                }

                if (!found)
                {
                    circuit.push(edge);
                }
            }

            for(var k=0; k<MME.length; k++)
            {
                circuit.push(MME[k]);
            }

            return circuit;
        };
    }])
    .filter('formatEdge', ['data', function(data){

        function formatEdgeFilter(input)
        {
            var source = data.Points[input.source];
            var destination = data.Points[input.destination];

            return source.value + ' - ' + destination.value + ' (' +
                data.Distances[input.source][input.destination] + ' km)';
        }

        return formatEdgeFilter;
    }])
    .filter('formatCircuit', ['data', function(data){

        function formatCircuitFilter(input)
        {
            var formatedText = "";
            var totalDistance = 0;

            if (input != null)
            {
                for(var i =0; i < input.length; i++)
                {
                    var edge = input[i];

                    totalDistance += data.Distances[edge.source][edge.destination];

                    formatedText += data.Points[edge.source].value + " -> " +
                        data.Points[edge.destination].value;

                    if (i < input.length -1)
                    {
                        formatedText += " -> ";
                    }
                }
            }
            return formatedText + " (" + totalDistance + " km)";
        }

        return formatCircuitFilter;
    }]);