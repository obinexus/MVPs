section .data
    message db "OBINexus: System integrity nominal.", 0Ah
    msglen  equ $ - message

section .text
    global _start

_start:
    ; write syscall: write(stdout, message, length)
    mov eax, 4          ; syscall number for write
    mov ebx, 1          ; file descriptor 1 = stdout
    mov ecx, message    ; pointer to the message
    mov edx, msglen     ; length of the message
    int 0x80            ; interrupt to invoke syscall

    ; exit syscall: exit(0)
    mov eax, 1          ; syscall number for exit
    xor ebx, ebx        ; return code 0
    int 0x80
    ; This program writes a message to stdout and exits cleanly.
    ; It is a simple demonstration of system calls in assembly.
    ; The message indicates that the system integrity is nominal.
    ; This code is written in NASM syntax for Linux x86 architecture.
    ; To assemble and run this code: