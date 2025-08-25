// Gosilang MVP Test Cases
// OBINexus Computing - Thread-Safe Quantum Computation

// Vector construction with normalization
let V := !vec<3>(24, 6, 4)
let magnitude := mag(V)  // = 1.0 by construction

// Axis-tagged vector sugar
let position := !<x,y,z>(1, 1, 1)

// Bind operation - lazy parallel diff
let EVERYTHING := 42
let UNIVERSE := vec(23, 45, 67, 2, 5)

#bind(EVERYTHING, UNIVERSE)
// Results in: [19, -3, -25, 40, 37]
#unbind(EVERYTHING)

// Span and range operations
let yards := 1760
let miles := yards_to_miles(yards)
let R := range[0..miles]
let S := span[-1..1]

// Unit physics with force calculation
#def[ F(m,a) -> m*a ]
let force := F(30, 9.8)  // 30kg * 9.8m/s² = 294N

// NIL vs NULL handling
let unbound_value := nil
let outside_space := null

// Macro definitions
#def[ norm(v) -> v / mag(v) ]
#def[ dot(a,b) -> sum(a[i]*b[i] for i in 0..len(a)-1) ]

// Complex span boundary
let complex_point := span[sqrt(-1)..sqrt(4)]  // crosses into complex domain
