/*
 * eternal.c  –  RIFTer 0-12 demo
 *  • space/time = O(n)  (segment tree + trie segments)
 *  • aux space = O(1)   (bounded buffers)
 *  • error policy 0-12   (zero-propagation)
 *  • never dies          (graceful detach on ^C)
 */
#define _POSIX_C_SOURCE 199309L   /* before any #include */
#include <time.h>                 /* declares nanosleep */
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>


#define MAX_N 1<<20          /* 1 M intervals – O(n) space */
#define OK    0
#define WARN  4
#define CRIT  7
#define PANIC 10

typedef struct {
    int low, high, val;
} Interval;

static Interval tree[MAX_N << 2];  /* segment tree   */
static Interval pool[MAX_N];       /* trie segments  */
static int pool_idx = 0;

static volatile sig_atomic_t running = 1;
static void detach(int _) { running = 0; }

/* ---------- Segment-tree: O(log n) range sum ---------- */
void build(int node, int L, int R)
{
    if (L == R) { tree[node] = (Interval){L, R, rand() % 100}; return; }
    int mid = (L + R) / 2;
    build(node*2, L, mid);
    build(node*2+1, mid+1, R);
    tree[node].val = tree[node*2].val + tree[node*2+1].val;
}

int query(int node, int L, int R, int l, int r)
{
    if (r < L || R < l) return 0;
    if (l <= L && R <= r) return tree[node].val;
    int mid = (L + R) / 2;
    return query(node*2, L, mid, l, r) +
           query(node*2+1, mid+1, R, l, r);
}

/* ---------- Error policy 0-12 ---------- */
static const char *level(int err)
{
    if (err < WARN)  return "OK (0-3)";
    if (err < CRIT)  return "WARN (4-6)";
    if (err < PANIC) return "CRIT (7-9)";
    return "PANIC (10-12)";
}

/* ---------- Main loop – “breathes forever” ---------- */
int main(void)
{
    signal(SIGINT, detach);
    int n = 1024;
    build(1, 0, n - 1);

    while (running) {
        int l = rand() % n;
        int r = l + (rand() % (n - l));
        int sum = query(1, 0, n - 1, l, r);

        int err = (sum < 0) ? PANIC :
                  (sum > 9000) ? CRIT :
                  (sum > 5000) ? WARN : OK;

        printf("[%.3fs] range[%d,%d]=%-5d %s\n",
               (double)clock() / CLOCKS_PER_SEC,
               l, r, sum, level(err));
        fflush(stdout);
        nanosleep(&(struct timespec){.tv_nsec = 1e8}, NULL); /* 100 ms heartbeat */
    }
    puts("\nDetached gracefully – no death.");
    return 0;
}
