function inverterString() {
    const entrada = prompt("Introduza uma string para inverter:");
    
    
    if (entrada !== null) {
        
        const stringInvertida = entrada.split('').reverse().join('');
        console.log(stringInvertida);
    }
}