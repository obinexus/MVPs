#include "gosilang.h"
#include "aura256.h"
#include "pigeonhole.h"
#include "repl.h"

int main(void)
{
    printf("Gosilang %s - %s\n", GOSILANG_VERSION, GOSILANG_AUTHOR);
    printf("Thread Safe by Design #sorrynotsorry\n\n");
    
    // Initialize subsystems
    ph_reset();
    
    // Test AuraSeal
    double priv[3] = {1.23, 4.56, 7.89};
    double pub = 42.0;
    aura256_t seal;
    aura256_seal(priv, pub, seal);
    
    printf("AuraSeal = ");
    for(int i = 0; i < 32; i++) printf("%02x", seal[i]);
    printf("\n");
    
    bool collision = ph_mark(seal);
    printf("Collision? %s\n", collision ? "YES (NIL)" : "NO (NULL)");
    printf("Penalty = %.3f sec\n\n", 0.125);
    
    // Start REPL
    repl();
    
    return 0;
}
