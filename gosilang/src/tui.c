/*
 * tui.c  –  Pomodoro-aware TUI for the RIFTer CLI
 *           One screen, one loop, no recursion.
 */
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <unistd.h>
#include <signal.h>
#include <termios.h>

#define WORK_MIN   25
#define REST_MIN    5

static volatile sig_atomic_t quit = 0;
static struct termios orig;

static void reset_term(void) { tcsetattr(STDIN_FILENO, TCSAFLUSH, &orig); }

static void sigint(int _) { quit = 1; }

static void raw_mode(void)
{
    tcgetattr(STDIN_FILENO, &orig);
    atexit(reset_term);
    signal(SIGINT, sigint);

    struct termios raw = orig;
    raw.c_lflag &= ~(ECHO | ICANON);
    raw.c_cc[VMIN]  = 0;
    raw.c_cc[VTIME] = 1;
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw);
}

static void draw(int left, int phase)
{
    printf("\033[2J\033[H");          /* clear screen, home cursor */
    printf("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n");
    printf("┃  RIFTer Pomodoro — %s %-5d ┃\n",
           phase == 0 ? "Work" : "Rest", left);
    printf("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n");
    printf("Press 'q' to quit, 'p' to pause, 'r' to resume.\n");
    fflush(stdout);
}

static int kbhit(void)
{
    char c;
    int r = read(STDIN_FILENO, &c, 1);
    if (r > 0) return c;
    return -1;
}

int tui_main(int argc, char **argv)
{
    (void)argc, (void)argv;
    raw_mode();

    int phase = 0;                  /* 0 = work, 1 = rest */
    int total = phase == 0 ? WORK_MIN * 60 : REST_MIN * 60;
    int left  = total;

    while (!quit) {
        draw(left / 60, phase);

        int c = kbhit();
        if (c == 'q') break;
        if (c == 'p') { while (kbhit() != 'r' && !quit) sleep(1); }

        sleep(1);
        if (--left <= 0) {
            phase ^= 1;
            left = (phase == 0 ? WORK_MIN : REST_MIN) * 60;
        }
    }
    reset_term();
    return 0;
}
