/* global angular */

angular.module('pathFinderDemo', [])
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
            var distances = $scope.data.Distances;
            var size = distances.length;

            $scope.MST = pathFinder.getMinimumSpanningTree(root, distances);

            $scope.MME = pathFinder.getMinimumMatchingEdges($scope.MST, distances);

            $scope.BC = pathFinder.getBaseCycle($scope.MST, $scope.MME);

            $scope.EC = pathFinder.getEulerianCircuit(size, root, $scope.BC);

            $scope.HC = pathFinder.getHamiltonianCircuit(root, $scope.EC, distances);

            $scope.OPT = pathFinder.getOptimizedCircuits($scope.HC, distances);
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
                    if (!vertexInArray(j, A) && source != j)
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

        PathFinder.getMinimumMatchingEdges = function(MST, distances)
        {
            var edges = copyEdges(MST);
            var size = distances.length;
            var ODV = getOddDegreeVertex(size, edges);
            var MME = [];
            var source;
            var minimum;
            var destination = null;

            while (ODV.length > 0)
            {
                // Guard conditions: cannot find matching with an odd number of vertices
                if (ODV.length % 2)
                {
                    throw "The minimum matching edges cannot be found: an even number of odd degree vertices is required.";
                }

                source = ODV[0];
                minimum = -1;
                destination = null;

                // Find minimum distance from source to another odd degree vertex
                for (var i = 1; i < ODV.length; i++)
                {
                    if (minimum === -1 || distances[source][ODV[i]] < minimum)
                    {
                        destination = ODV[i];
                        minimum = distances[source][destination];
                    }
                }

                if (destination !== null)
                {
                    var edge = {
                        source: source,
                        destination: destination
                    };

                    MME.push(edge);
                    edges.push(edge);

                    ODV = getOddDegreeVertex(size, edges);
                }
            }

            return MME;
        };

        function getOddDegreeVertex(size, MST)
        {
            var ODV = [];

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
                cycle.push(MST[i]);
            }

            for(var j=0; j<MME.length; j++)
            {
                cycle.push(MME[j]);
            }

            return cycle;
        };

        PathFinder.getEulerianCircuit = function(size, root, cycle)
        {
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

        PathFinder.getHamiltonianCircuit = function(root, circuit, distances)
        {
            var size = distances.length;

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
                    // Save this circuit if not already in list
                    if (!circuitExists(OPT, OC))
                    {
                        OPT.push(OC);

                        // Restart
                        index = 0;
                    }
                }
                else
                {
                    index++;
                }
            }

            return OPT;
        };

        function circuitExists(OPT, OC)
        {
            var isUnique = true;

            // Test for circuit existence
            for (var i=0; i < OPT.length; i++)
            {
                var circuit = OPT[i];

                // Hypothesis: the circuit is not unique
                isUnique = false;

                for (var j=0; j < OC.length; j++)
                {
                    // Looking for a single difference
                    if (OC[j] !== circuit[j])
                    {
                        isUnique = true;
                        break;
                    }
                }

                // End lookup when an exact circuit
                // match is found
                if (!isUnique) break;
            }

            // If unique, the circuit does not
            // already exists (inverse logic)
            return !isUnique;
        }

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
                    circuit.splice(circuit.length - 1, 1);
                }
                else
                {
                    // Insert shortcut
                    circuit.splice(index,0, edge);

                    // Remove the following 2 edges
                    circuit.splice(index + 1, 2);
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

        /**
         * Find the arc order from the root that form
         * an eulerian circuit
         * @param root
         * @param markedCircuit
         * @returns {Array}
         */
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

        /**
         * Remove arc at given index in array
         * @param A
         * @param index
         */
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

                    if (arcInArray(arc, AA))
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
                        if (!vertexInArray(source, V))
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
            var neighbors = [];
            var paths = [];

            while(unbalancedVertices.length > 0)
            {
                var path = [];

                // A change of one or more arc could be made
                var found = false;

                // First, look around each unbalanced vertices
                var unbalancedNeighbor = getUnbalancedNeighbor(unbalancedVertices, circuit);
                if (unbalancedNeighbor !== null)
                {
                    // Guard against modification to an already changed neighbor
                    if (!vertexInArray(unbalancedNeighbor.vertex, neighbors))
                    {
                        neighbors.push(unbalancedNeighbor.vertex);

                        var arc = circuit[unbalancedNeighbor.index];

                        swapArc(arc);

                        found = true;
                    }
                }

                if (found === false)
                {
                    // Look for a path to another unbalanced vertex
                    for (var i=0; i < unbalancedVertices.length; i++)
                    {
                        var vertex = unbalancedVertices[i];

                        var V = [];
                        V.push(vertex);

                        // Remove initial vertex from possible destinations to avoid infinite loop
                        var vertices = excludeFromArray(vertex, unbalancedVertices);

                        found = findPathTo(vertices, V, circuit, path);

                        if (found)
                        {
                            // Guard against modification to an already changed path
                            if (!pathInArray(path, paths))
                            {
                                paths.push(path);

                                // Swap the path
                                swapPath(circuit, path);

                                break;
                            }
                        }
                        else if (i === unbalancedVertices.length - 1)
                        {
                            throw "Unable to balance circuit: no path between unbalanced vertices could be found.";
                        }
                    }
                }

                unbalancedVertices = getUnbalancedVertices(size, circuit);
            }
        }

        function swapPath(circuit, path)
        {
            var arc, index;

            for (var i=0; i < path.length; i++)
            {
                index = path[i].index;

                arc = circuit[index];

                swapArc(arc);
            }
        }

        function swapArc(arc)
        {
            var source = arc.source;

            arc.source = arc.destination;
            arc.destination = source;
        }

        function getUnbalancedNeighbor(unbalancedVertices, circuit)
        {
            for (var i=0; i < unbalancedVertices.length; i++)
            {
                var vertex = unbalancedVertices[i];

                var neighbours = getVertexNeighbours(vertex, circuit);

                for (var j=0; j < neighbours.length; j++)
                {
                    var neighbor = neighbours[j];

                    if (vertexInArray(neighbor.vertex, unbalancedVertices))
                    {
                        return neighbor;
                    }
                }
            }

            return null;
        }

        function getVertexNeighbours(vertex, circuit)
        {
            var neighbours = [];
            var source, destination;

            // Guard array to avoid inserting multiple reference to same neighbor
            var V = [];

            for(var i=0; i < circuit.length; i++)
            {
                if (circuit[i].source === vertex)
                {
                    destination = circuit[i].destination;

                    if (!vertexInArray(destination, V))
                    {
                        V.push(destination);

                        neighbours.push({
                            index: i,
                            vertex: destination
                        });
                    }
                }
                else if (circuit[i].destination === vertex)
                {
                    source = circuit[i].source;

                    if (!vertexInArray(source, V))
                    {
                        V.push(source);

                        neighbours.push({
                            index: i,
                            vertex: source
                        });
                    }
                }
            }

            return neighbours;
        }

        function findPathTo(vertices, V, circuit, path)
        {
            // Look recursively for the destination vertex by following
            // out arcs without going back to a previously visited vertex

            // Current vertex is the last one added
            var current = V[V.length - 1];

            var outArcs = getOutArcs(current, circuit);

            var destinations = getDestinations(outArcs);

            var found = false;

            for (var i=0; i < destinations.length; i++)
            {
                var vertex = destinations[i].vertex;
                var arc = destinations[i].arc;

                if (vertexInArray(vertex, vertices))
                {
                    // Found an unbalanced vertex add final arc to path
                    path.push(arc);

                    found = true;
                }
                else
                {
                    // Loop guard condition
                    if (!vertexInArray(vertex, V))
                    {
                        V.push(vertex);

                        path.push(arc);

                        // Recursive call
                        found = findPathTo(vertices, V, circuit, path);
                    }
                }

                if (found) break;
            }

            return found;
        }

        function getDestinations(arcs)
        {
            var D = [];
            var arc;

            for (var i=0; i < arcs.length; i++)
            {
                arc = arcs[i];

                D.push({
                    arc: arc,
                    vertex: arcs[i].destination
                });
            }

            return D;
        }

        function getOutArcs(vertex, circuit)
        {
            var A = [];

            for (var i=0; i < circuit.length; i++)
            {
                var arc = circuit[i];

                if (arc.source === vertex)
                {
                    if (!arcInArray(arc, A))
                    {
                        A.push({
                            index: i,
                            source: arc.source,
                            destination: arc.destination
                        });
                    }
                }
            }

            return A;
        }

        function vertexInArray(vertex, V)
        {
            return V.indexOf(vertex) !== -1;
        }

        function arcInArray(arc, A)
        {
            var found = false;

            for (var i=0; i < A.length; i++)
            {
                if (arc.source === A[i].source &&
                    arc.destination === A[i].destination)
                {
                    found = true;
                    break;
                }
            }

            return found;
        }

        function pathInArray(path, P)
        {
            var found;
            var arc;

            for (var i=0; i < P.length; i++)
            {
                found = true;

                for (var j=0; j < P[i].length; j++)
                {
                    arc = P[i][j];

                    if (arc.source !== path[j].source ||
                        arc.destination !== path[j].destination)
                    {
                        found = false;
                        break;
                    }
                }

                if (found)
                {
                    return true;
                }
            }

            return false;
        }

        /**
         * Exclude one element from the given array
         * @param element The element to exclude
         * @param A The array to look up
         * @returns A copy of the given array excluding the given element
         */
        function excludeFromArray(element, A)
        {
            var index = A.indexOf(element);
            var V = A;

            if (index !== -1)
            {
                V = [];
                for (var i=0; i < A.length; i++)
                {
                    if(A[i] !== element)
                    {
                        V.push(A[i]);
                    }
                }
            }

            return V;
        }

        function getUnbalancedVertices(size, cycle)
        {
            var degree = getDegree(size, cycle);
            var vertices = [];

            for(var i=0; i<size; i++)
            {
                if (degree[i].in !== degree[i].out)
                {
                    vertices.push(i);
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

            if (input != null)
            {
                for(var i =0; i < input.length; i++)
                {
                    var edge = input[i];

                    formatedText += "[" + data.Points[edge.source].value + "," +
                        data.Points[edge.destination].value + "]";

                    if (i < input.length -1)
                    {
                        formatedText += ", ";
                    }
                }
            }
            return formatedText;
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
            return formatedText + " (" + totalDistance.toFixed(3) + " km)";
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
            return formatedText + " (" + totalDistance.toFixed(3) + " km)";
        }

        return formatPointCircuitFilter;
    }]);