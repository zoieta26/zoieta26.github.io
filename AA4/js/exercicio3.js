function removerExtremos() {
    const entrada = prompt("Introduza uma string:");
    if (entrada !== null) { 
        alert(entrada.substring(1, entrada.length - 1));
    }
}