/* global angular */

angular.module('pathFinderDemo', [])
    .value('data', {
        Distances:[
            [ 0, 7, 4,10,10],
            [ 7, 0, 6, 7, 1],
            [ 4, 6, 0,16, 2],
            [10, 7, 16,0, 6],
            [10, 1, 2, 6, 0]
        ],

        Points: [
            {id: '0', value: 'A'},
            {id: '1', value: 'B'},
            {id: '2', value: 'C'},
            {id: '3', value: 'D'},
            {id: '4', value: 'E'}
        ],
        start: {id:'1', value: 'B'}
    })
    .controller('pathFinderController', ['$scope', 'data', 'pathFinderService',
        function($scope, data, pathFinderService) {

        $scope.data = data;
        $scope.MST = null; // Minimum spanning tree
        $scope.MME = null; // Minimum Matching Edges
        $scope.BC = null; // Basic cycle
        $scope.EC = null; // Eulerian circuit (passing on each edges once)
        $scope.HC = null; // Hamiltonian circuit (passing on each vertices once)
        $scope.OPT = null; // Optimized circuits variant

        var pathFinder = pathFinderService;

        $scope.evaluate = function(start)
        {
            var root = Number(start.id);

            $scope.MST = pathFinder.getMinimumSpanningTree(root, $scope.data.Distances);

            $scope.MME = pathFinder.getMinimumMatchingEdges($scope.data.Points, $scope.MST, $scope.data.Distances);

            $scope.BC = pathFinder.getBaseCycle($scope.MST, $scope.MME);

            $scope.EC = pathFinder.getEulerianCircuit($scope.data.Points, root, $scope.BC);

            $scope.HC = pathFinder.getHamiltonianCircuit($scope.data.Points, root, $scope.EC, $scope.data.Distances);

            $scope.OPT = pathFinder.getOptimizedCircuits($scope.HC, $scope.data.Distances);
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

        PathFinder.getMinimumSpanningTree = function(root, distances)
        {
            var A = [];
            var MST = [];

            // Default start point (arbitrary)
            A.push(root);

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

        PathFinder.getMinimumMatchingEdges = function(points, MST, distances)
        {
            var MME = [];
            var V = []; // List of already processed vertex

            var ODV = getOddDegreeVertex(points, MST);

            for (var i = 0; i < ODV.length; i++)
            {
                var source = ODV[i];
                var minimum = -1;
                var destination = null;

                for (var j = 0; j < ODV.length; j++)
                {
                    // Do not process the same odd degree vertex
                    if (V.indexOf(source) === -1 && V.indexOf(j) === -1 && i !== j)
                    {
                        if (minimum === -1 || distances[source][ODV[j]] < minimum)
                        {
                            destination = ODV[j];
                            minimum = distances[source][destination];
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
        
        function getOddDegreeVertex(points, MST)
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
        }

        function getVertexDegree(size, MST)
        {
            var degree = initializeArrayOfIntegers(size, 0);

            for(var j = 0; j < MST.length; j++)
            {
                degree[MST[j].source]++;
                degree[MST[j].destination]++;
            }

            return degree;
        }

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

        PathFinder.getEulerianCircuit = function(points, root, cycle)
        {
            var size = points.length;
            var circuit = copyEdges(cycle);

            // Each vertex must have an equal number of
            // source and destination
            balanceCircuit(size, circuit);

            // To evaluate an eulerian circuit
            // first, evaluate the anti-arborescence
            var AA = getAntiArborescence(root, size, circuit);

            // Mark each outgoing arc with an id number
            var markedCircuit = getMarkedCircuit(circuit, size, AA);

            return findEulerianCircuit(root, markedCircuit);
        };

        PathFinder.getHamiltonianCircuit = function(points, root, circuit, distances)
        {
            var size = points.length;

            var HC = copyEdges(circuit);

            var vertices = getMultiPassesOnVertices(size, HC);

            for (var i=0; i < vertices.length; i++)
            {
                var pairs = getEdgePairs(vertices[i], HC);

                var shortcuts = findShortcuts(pairs, distances);

                // Apply shortcuts to circuit
                updateCircuit(shortcuts, HC);
            }

            return orderFromStartPoint(root, HC);
        };

        PathFinder.getOptimizedCircuits = function(circuit, distances)
        {
            var OC = copyEdges(circuit);
            var OPT = [];
            var index = 0;

            // 2-opt post optimization
            while(index < OC.length)
            {
                var current = {
                    index: index,
                    source: OC[index].source,
                    destination: OC[index].destination
                };

                var candidates = getEdgeCandidates(current, OC);

                var diff = optimize(current, candidates, distances, OC);

                if (diff < 0)
                {
                    // Save this circuit
                    OPT.push(OC);

                    // Restart
                    index = 0;
                }
                else
                {
                    index++;
                }
            }

            return OPT;
        };

        function optimize(current, candidates, distances, OC)
        {
            var diff = 0;

            for (var i=0; i < candidates.length; i++)
            {
                var edge = candidates[i].edge;
                var oldWeight = distances[current.source][current.destination] +
                                distances[edge.source][edge.destination];

                // Exchange vertex
                var newWeight = distances[current.source][edge.source] +
                                distances[current.destination][edge.destination];

                if (newWeight - oldWeight < 0)
                {
                    // Found a better circuit, replace edges
                    diff = newWeight - oldWeight;

                    // Add first edge (shift previous edge to next index)
                    OC.splice(candidates[i].index, 0, {
                        source: current.destination,
                        destination: edge.destination
                    });

                    // Remove previous edge
                    OC.splice(candidates[i].index + 1, 1);

                    // Add second edge (shift previous edge to next index)
                    OC.splice(current.index, 0, {
                        source: current.source,
                        destination: edge.source
                    });

                    // Remove previous edge
                    OC.splice(current.index + 1, 1);

                    // Every edges in between must be reversed
                    reverseEdgeRange(current.index, candidates[i].index, OC);

                    break;
                }
            }

            return diff;
        }

        function reverseEdgeRange(from, to, OC)
        {
            var edges = [];

            // A deep copy is needed for this to work
            for (var i=from+1; i < to; i++)
            {
                edges.push({
                    source: OC[i].source,
                    destination: OC[i].destination
                });
            }

            for (var j=to-1, k=0; j > from; j--, k++)
            {
                OC[j].source = edges[k].destination;
                OC[j].destination = edges[k].source;
            }
        }

        function getEdgeCandidates(current, circuit)
        {
            var candidates = [];

            for (var i=0; i < circuit.length; i++)
            {
                var edge = circuit[i];

                // A valid candidate edge must not be linked
                // to the current edge
                if (current.source !== edge.source &&
                    current.source !== edge.destination &&
                    current.destination !== edge.source &&
                    current.destination !== edge.destination)
                {
                    candidates.push({
                        index: i,
                        edge:edge
                    });
                }
            }

            return candidates;
        }

        function orderFromStartPoint(root, circuit)
        {
            var preEdges = [];
            var postEdges = [];
            var found = false;

            for (var i=0; i < circuit.length; i++)
            {
                var edge = circuit[i];

                if (edge.source === root)
                {
                    found = true;
                }

                if (found)
                {
                    postEdges.push(edge);
                }
                else
                {
                    preEdges.push(edge);
                }
            }

            return postEdges.concat(preEdges);
        }

        function copyEdges(edges)
        {
            var a = [];

            for (var i=0; i < edges.length; i++)
            {
                a.push({
                    source: edges[i].source,
                    destination: edges[i].destination
                });
            }

            return a;
        }

        function updateCircuit(shortcuts, circuit)
        {
            for (var i=0; i<shortcuts.length; i++)
            {
                var shortcut = shortcuts[i];

                var index = shortcut.index;
                var edge = {
                    source: shortcut.edges[0].source,
                    destination: shortcut.edges[1].destination
                };

                // When shortcut insertion point is at end of circuit
                if (index === circuit.length - 1)
                {
                    // Insert shortcut
                    circuit.splice(index,0, edge);

                    // Remove first and last edges
                    circuit.splice(0, 1);
                    circuit.splice(0, circuit.length - 1);
                }
                else
                {
                    // Insert shortcut
                    circuit.splice(index,0, edge);

                    // Remove the following 2 edges
                    circuit.splice(index+1, 2);
                }
            }
        }

        function findShortcuts(pairs, distances)
        {
            var shortcuts = [];

            // The number of shortcuts required
            var count = pairs.length - 1;

            while(shortcuts.length < count)
            {
                var minimum = undefined;
                var index = undefined;

                for (var i=0; i < pairs.length; i++)
                {
                    var edges = pairs[i].edges;

                    var source = edges[0].source;
                    var destination = edges[1].destination;

                    var distance = distances[source][destination];

                    if (minimum === undefined || distance < minimum)
                    {
                        minimum = distance;

                        index = i;
                    }
                }

                shortcuts.push(pairs[index]);

                // Remove shortcut found from pairs array
                pairs.splice(index, 1);
            }

            return shortcuts;
        }

        function getEdgePairs(vertex, circuit)
        {
            var pairs = [];

            for (var i=0; i < circuit.length; i++)
            {
                var edge = circuit[i];
                var E = [];

                if (edge.destination === vertex)
                {
                    E.push(edge);

                    // Look up next edge in circuit (loops back to first edge if on last edge)
                    edge = (i+1 < circuit.length) ? circuit[i + 1] : circuit[0];

                    if (edge.source === vertex)
                    {
                        E.push(edge);

                        pairs.push({
                            index: i,
                            edges: E
                        });
                    }
                }
            }

            return pairs;
        }

        function getMultiPassesOnVertices(size, circuit)
        {
            var V = initializeArrayOfIntegers(size, 0);
            var vertices = [];

            for (var i=0; i < circuit.length; i++)
            {
                V[circuit[i].source]++;
                V[circuit[i].destination]++;
            }

            for (var j=0; j < V.length; j++)
            {
                if (V[j] > 2)
                {
                    vertices.push(j);
                }
            }

            return vertices;
        }

        // Find the arc order from the root
        function findEulerianCircuit(root, markedCircuit)
        {
            var total = markedCircuit.length;
            var vertex = root;
            var EC = [];

            // Temporary array holds objects with position and sort-value
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

                    EC.push({
                        source: arc.source,
                        destination: arc.destination
                    });

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

                    if (edgeInArray(arc, AA))
                    {
                        // Give the highest number for the AA arc
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
            var unbalancedVertices = getUnbalancedVertices(size, circuit);
            var swappedEdges = []; // List of already swapped edges

            while(unbalancedVertices.length > 0)
            {
                var edge = swapEdge(circuit, unbalancedVertices);

                if (!edgeInArray(edge, swappedEdges))
                {
                    swappedEdges.push(edge);
                    unbalancedVertices = getUnbalancedVertices(size, circuit);
                }
                else
                {
                    throw "Failure to balance circuit.";
                }
            }
        }

        function edgeInArray(arc, AA)
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

        function swapEdge(circuit, unbalancedVertices)
        {
            // Prioritize edge swapping
            var unbalancedEdges = getUnbalancedEdges(circuit, unbalancedVertices);
            var order = getSwapOrder(unbalancedEdges);
            var edge = circuit[order[0]];
            var source  = edge.source;

            edge.source = edge.destination;
            edge.destination = source;

            return edge;
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

            // Order only edges on unbalanced vertex
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

        function getUnbalancedEdges(circuit, unbalancedVertices)
        {
            var edges = initializeArrayOfIntegers(circuit.length, 0);

            for (var i=0; i < unbalancedVertices.length; i++)
            {
                var vertex = unbalancedVertices[i];
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

        function getUnbalancedVertices(size, cycle)
        {
            var degree = getDegree(size, cycle);
            var vertices = [];

            for(var i=0; i<size; i++)
            {
                if (degree[i].in !== degree[i].out)
                {
                    vertices.push({
                        id: i,
                        diff: degree[i].in - degree[i].out
                    });
                }
            }

            return vertices;
        }

        function getDegree(size, cycle)
        {
            var outDegree = initializeArrayOfIntegers(size, 0);
            var inDegree = initializeArrayOfIntegers(size, 0);

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

        function initializeArrayOfIntegers(size, value)
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
    .filter('formatEdgeCircuit', ['data', function(data){

        function formatEdgeCircuitFilter(input)
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

        return formatEdgeCircuitFilter;
    }])
    .filter('formatPointCircuit', ['data', function(data){

        function formatPointCircuitFilter(input)
        {
            var formatedText = "";
            var totalDistance = 0;

            if (input != null)
            {
                for(var i =0; i < input.length; i++)
                {
                    var edge = input[i];

                    totalDistance += data.Distances[edge.source][edge.destination];

                    formatedText += i < input.length-1 ? data.Points[edge.source].value + " -> " :
                    data.Points[edge.source].value + " -> " + data.Points[edge.destination].value;
                }
            }
            return formatedText + " (" + totalDistance + " km)";
        }

        return formatPointCircuitFilter;
    }]);