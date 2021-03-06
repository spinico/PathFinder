angular.module('pathFinderDemo')
    //.value('data', {
    //    Distances:[
    //        [ 0, 7, 4,10,10],
    //        [ 7, 0, 6, 7, 1],
    //        [ 4, 6, 0,16, 2],
    //        [10, 7, 16,0, 6],
    //        [10, 1, 2, 6, 0]
    //    ],
    //
    //    Points: [
    //        {id: '0', value: 'A'},
    //        {id: '1', value: 'B'},
    //        {id: '2', value: 'C'},
    //        {id: '3', value: 'D'},
    //        {id: '4', value: 'E'}
    //    ],
    //    start: {id:'1', value: 'B'}
    //})
    .value('data', {
        Distances:[
            [0,     0.098, 0.34, 0.454, 0.291, 0.104, 0.464, 0.293, 0.089],
            [0.098, 0,     0.75, 0.5,   0.24,  0.55,  0.45,  0.4,   0.5],
            [0.34,  0.75,  0,    0.29,  0.55,  0.27,  0.7,   0.35,  0.3],
            [0.454, 0.5,   0.29, 0,     0.35,  0.17,  0.55,  0.2,   0.14],
            [0.291, 0.24,  0.55, 0.35,  0,     0.4,   0.35,  0.19,  0.25],
            [0.104, 0.55,  0.27, 0.17,  0.4,   0,     0.75,  0.4,   0.3],
            [0.464, 0.45,  0.7,  0.55,  0.35,  0.75,  0,     0.35,  0.45 ],
            [0.293, 0.4,   0.35, 0.2,   0.19,  0.4,   0.35,  0,     0.061],
            [0.089, 0.5,   0.3,  0.14,  0.25,  0.3,   0.45,  0.061, 0]
        ],

        Points: [
            {id: '0', value: 'A'},  // 575 St-Charles
            {id: '1', value: 'B'},  // 595 Marie-Victorin
            {id: '2', value: 'C'},  // 46 Pierre-Boucher
            {id: '3', value: 'D'},  // 10 de Grandpre
            {id: '4', value: 'E'},  // 7 La Perriere N
            {id: '5', value: 'F'},  // 510 Marie-Victorin
            {id: '6', value: 'G'},  // 62 de Montbrun
            {id: '7', value: 'H'},  // 554 Saint-Charles
            {id: '8', value: 'I'}   // 542 Saint-Charles
        ],
        start: {id:'2', value: 'C'}
});
