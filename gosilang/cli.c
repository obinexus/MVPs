/*
 * cli.c  –  Minimal CLI front-end for gosi resume / pause / disk
 *           Single-pass, no recursion, human-rhythm first.
 */
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/stat.h>

static const char *disk_path = "/tmp/gosi_disk";

static void save_disk(void)
{
    FILE *f = fopen(disk_path, "w");
    if (!f) { perror("save_disk"); return; }
    fprintf(f, "snapshot\n");
    fclose(f);
}

static void load_disk(void)
{
    FILE *f = fopen(disk_path, "r");
    if (!f) { puts("No saved disk."); return; }
    char buf[256];
    while (fgets(buf, sizeof buf, f)) printf("restored: %s", buf);
    fclose(f);
}

int cli_main(int argc, char **argv)
{
    if (argc < 2) {
        puts("Usage: gosi {pause|resume|tui}");
        return 1;
    }

    if (!strcmp(argv[1], "pause"))  { save_disk(); puts("Paused."); }
    else if (!strcmp(argv[1], "resume")) { load_disk(); puts("Resumed."); }
    else if (!strcmp(argv[1], "tui")) tui_main(argc - 1, argv + 1);
    else puts("Unknown command.");
    return 0;
}
