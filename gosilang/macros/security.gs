// Security macros using Bayes and Pigeonhole
#def[ posterior(prior, likelihood, evidence) -> (likelihood * prior) / evidence ]

#def[ collision_rate(entries, slots) -> 1 - exp(-entries * (entries - 1) / (2 * slots)) ]

#def[ secure_bind(everything, universe) -> {
    let delta := parallel_bind(everything, universe)
    let security := posterior(0.001, 0.999, 0.089)
    if security < 0.95 then NIL else delta
}]
