function verificarIntervalos() {
    
    for (let i = 1; i <= 2; i++) {
        const valorInformado = prompt(`Informe o número ${i} (de 2):`);
        
        
        if (valorInformado === null) continue; 
        
        const num = parseInt(valorInformado, 10);
        
        console.log(`Número informado: ${num}`);
        
        
        if (num >= 30 && num <= 50) {
            console.log(`${num} está no intervalo [30,50].`);
        } else if (num >= 60 && num <= 100) {
            console.log(`${num} está no intervalo [60,100].`);
        } else {
            console.log(`O número informado não está em nenhum dos dois intervalos.`);
        }
    }
}