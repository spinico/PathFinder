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
        $scope.MST = null; // Minimum spanning tree
        $scope.ODV = null; // Odd Degree Vertex
        $scope.MME = null; // Minimum Matching Edges
        $scope.cycle = null; // Approx circuit

        var pathFinder = pathFinderService;

        $scope.evaluate = function(start)
        {
            $scope.MST = pathFinder.getMinimumSpanningTree(start.id, $scope.data.Distances);

            $scope.ODV = pathFinder.getOddDegreeVertex($scope.data.Points, $scope.MST);

            $scope.MME = pathFinder.getMinimumMatchingEdges($scope.ODV, $scope.data.Distances);

            $scope.cycle = pathFinder.getBaseCycle($scope.MST, $scope.MME);

            $scope.circuit = pathFinder.getEulerianCircuit($scope.data.Points, start.id, $scope.cycle);
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

        PathFinder.getMinimumSpanningTree = function(start, distances)
        {
            var A = [];
            var MST = [];

            // Default start point (arbitrary)
            A.push(Number(start));

            for (var i = 0; i < distances.length; i++)
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
            var degree = initializeIntegerArray(size, 0);

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
            var V = []; // List of already processed vertex

            for (var i = 0; i < ODV.length; i++)
            {
                var source = ODV[i];
                var minimum = -1;
                var destination = null;

                for (var j = 0; j < ODV.length; j++)
                {
                    // Do not process the same odd degree vertex
                    if (V.indexOf(i) === -1 && V.indexOf(j) === -1 && i !== j)
                    {
                        if (minimum === -1 || matrix[source][ODV[j]] < minimum)
                        {
                            destination = ODV[j];
                            minimum = matrix[source][destination];
                        }
                    }
                }

                if (destination != null)
                {
                    MME.push({
                        source: source,
                        destination: destination
                    });

                    V.push(source);
                    V.push(destination);
                }
            }

            return MME;
        };

        PathFinder.getBaseCycle = function(MST, MME)
        {
            var cycle = [];

            // Merge MST and MME
            for(var i=0; i<MST.length; i++)
            {
                cycle.push( MST[i]);
            }

            for(var j=0; j<MME.length; j++)
            {
                cycle.push(MME[j]);
            }

            return cycle;
        };

        PathFinder.getEulerianCircuit = function(points, start, cycle)
        {
            var size = points.length;
            var circuit = [];
            var root = Number(start);

            for (var i=0; i < cycle.length; i++)
            {
                circuit.push({
                    source: cycle[i].source,
                    destination: cycle[i].destination
                });
            }

            // All vertex must have an equal number of
            // source and destination
            balanceCircuit(size, circuit);

            // To evaluate an eulerian circuit
            // first, evaluate the anti-arborescence
            var AA = getAntiArborescence(root, size, circuit);

            // Mark each outgoing arc with an id number
            var markedCircuit = getMarkedCircuit(circuit, size, AA);

            return findEulerianCircuit(root, markedCircuit);
        };

        // Find the arc order from the root
        function findEulerianCircuit(root, markedCircuit)
        {
            var total = markedCircuit.length;
            var vertex = root;
            var EC = [];

            // temporary array holds objects with position and sort-value
            var A = markedCircuit.map(function(element, index) {
                return {
                    index: index,
                    id: element.id,
                    source: element.source,
                    destination: element.destination
                };
            });

            while(EC.length < total)
            {
                var arcs = getOutgoingArcs(A, vertex);

                if (arcs.length > 0)
                {
                    // Ascending sort
                    arcs.sort(function(a, b) {
                        return a.id - b.id;
                    });

                    var arc = arcs[0];

                    EC.push(arc);
                    vertex = arc.destination;

                    removeArc(A, arc.index);
                }
            }

            return EC;
        }

        function removeArc(A, index)
        {
            // Lookup the actual array index
            for (var i=0; i < A.length; i++)
            {
                if (index === A[i].index)
                {
                    A.splice(i,1);
                    break;
                }
            }
        }

        function getMarkedCircuit(circuit, size, AA)
        {
            var MC = [];

            for (var i=0; i < size; i++)
            {
                var arcs = getOutgoingArcs(circuit, i);
                var index = 1;

                for (var j=0; j < arcs.length; j++)
                {
                    var arc = arcs[j];

                    if (isArcInAntiArborescence(arc, AA))
                    {
                        // The highest number for the AA arc
                        arc.id = arcs.length;
                    }
                    else
                    {
                        arc.id = index++;
                    }

                    MC.push(arc);
                }
            }

            return MC;
        }

        function isArcInAntiArborescence(arc, AA)
        {
            var found = false;

            for (var i=0; i < AA.length; i++)
            {
                if (arc.source === AA[i].source &&
                    arc.destination === AA[i].destination)
                {
                    found = true;
                    break;
                }
            }

            return found;
        }

        function getOutgoingArcs(circuit, source)
        {
            var OA = [];

            for (var i=0; i < circuit.length; i++)
            {
                var edge = circuit[i];

                if (edge.source === source)
                {
                    OA.push(edge);
                }
            }

            return OA;
        }

        function getAntiArborescence(root, size, circuit)
        {
            var V = []; // List of already processed vertex
            var AA = [];
            var destination;
            var source;

            // Start on designated root
            V.push(root);

            for (var i=0; i < V.length; i++)
            {
                destination = V[i];

                // Look for edge with matching destination
                for (var j=0; j < circuit.length; j++)
                {
                    if (destination === circuit[j].destination)
                    {
                        source = circuit[j].source;

                        // Loop guard condition
                        if (V.indexOf(source) === -1)
                        {
                            V.push(source);

                            AA.push({
                                source: source,
                                destination: destination
                            });
                        }
                    }
                }

                if (V.length >= size)
                {
                    break;
                }
            }

            return AA;
        }

        function balanceCircuit(size, circuit)
        {
            var unbalancedVertex = getUnbalancedVertex(size, circuit);

            // This could loop indefinitely with an incompatible circuit
            while(unbalancedVertex.length > 0)
            {
                swapEdges(circuit, unbalancedVertex);

                unbalancedVertex = getUnbalancedVertex(size, circuit);
            }
        }

        function swapEdges(circuit, unbalancedVertex)
        {
            // Prioritize edge swapping
            var unbalancedEdges = getUnbalancedEdges(circuit, unbalancedVertex);
            var order = getSwapOrder(unbalancedEdges);
            var edge = circuit[order[0]];
            var source  = edge.source;

            edge.source = edge.destination;
            edge.destination = source;
        }

        function getSwapOrder(edges)
        {
            var order = [];

            // temporary array holds objects with position and sort-value
            var mapped = edges.map(function(element, index) {
                return { index: index, value: element };
            });

            // descending sort the mapped array containing the reduced values
            mapped.sort(function(a, b) {
                return b.value - a.value;
            });

            // container for the resulting order
            var result = mapped.map(function(element){
                return element.index;
            });

            // Remove edges on balanced vertex
            for (var i= 0; i < result.length; i++)
            {
                var index = result[i];

                if(edges[index] > 0)
                {
                    order.push(index);
                }
            }

            return order;
        }

        function getUnbalancedEdges(circuit, unbalanced)
        {
            var edges = initializeIntegerArray(circuit.length, 0);

            for (var i=0; i < unbalanced.length; i++)
            {
                var vertex = unbalanced[i];
                var index = [];

                if (vertex.diff < 0)
                {
                    // Unbalanced destination (in) edge index
                    index = getEdgeIndex(circuit, vertex, 'source');
                }
                else
                {
                    // Unbalanced source (out) edge index
                    index = getEdgeIndex(circuit, vertex, 'destination');
                }

                for(var j=0; j<index.length; j++)
                {
                    edges[index[j]]++;
                }
            }

            return edges;
        }

        function getEdgeIndex(circuit, vertex, type)
        {
            var index = [];

            for(var i=0; i<circuit.length; i++)
            {
                var edge = circuit[i];

                var id = (type === 'source') ? edge.source : edge.destination;

                if (id === vertex.id)
                {
                    index.push(i);
                }
            }

            return index;
        }

        function getUnbalancedVertex(size, cycle)
        {
            var degree = getInOutDegree(size, cycle);
            var unbalanced = [];

            for(var i=0; i<size; i++)
            {
                if (degree[i].in !== degree[i].out)
                {
                    unbalanced.push({
                        id: i,
                        diff: degree[i].in - degree[i].out
                    });
                }
            }

            return unbalanced;
        }

        function getInOutDegree(size, cycle)
        {
            var outDegree = initializeIntegerArray(size, 0);
            var inDegree = initializeIntegerArray(size, 0);

            for(var i=0; i<cycle.length; i++)
            {
                var edge = cycle[i];

                outDegree[edge.source]++;
                inDegree[edge.destination]++;
            }

            var inOutDegree = [];

            for(var j=0; j<size; j++)
            {
                inOutDegree.push(
                    {
                        out:outDegree[j],
                        in:inDegree[j]
                    }
                );
            }

            return inOutDegree;
        }

        function initializeIntegerArray(size, value)
        {
            var a = [];

            for(var i = 0; i < size; i++)
            {
                a.push(value);
            }

            return a;
        }

    }])
    .filter('formatEdge', ['data', function(data){

        function formatEdgeFilter(input)
        {
            var source = data.Points[input.source];
            var destination = data.Points[input.destination];

            return "[" + source.value + ',' + destination.value + '] (' +
                data.Distances[input.source][input.destination] + ' km)';
        }

        return formatEdgeFilter;
    }])
    .filter('formatCycle', ['data', function(data){

        function formatCycleFilter(input)
        {
            var formatedText = "";
            var totalDistance = 0;

            if (input != null)
            {
                for(var i =0; i < input.length; i++)
                {
                    var edge = input[i];

                    totalDistance += data.Distances[edge.source][edge.destination];

                    formatedText += "[" + data.Points[edge.source].value + "," +
                        data.Points[edge.destination].value + "]";

                    if (i < input.length -1)
                    {
                        formatedText += ", ";
                    }
                }
            }
            return formatedText + " (" + totalDistance + " km)";
        }

        return formatCycleFilter;
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

                    formatedText += "[" + data.Points[edge.source].value + "," +
                        data.Points[edge.destination].value + "]";

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