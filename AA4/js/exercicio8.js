function obterRegiaoFiscal() {
    
    const cpfDigitado = document.getElementById("textCPF").value;
    
    if (cpfDigitado.length !== 11) {
        document.getElementById("resultado-regiao").innerText = "O CPF deve ter exatamente 11 dígitos.";
        return;
    }

    const nonoDigito = cpfDigitado.charAt(8);
    
    const regioes = {
        '0': 'RS',
        '1': 'DF, GO, MT, MS e TO',
        '2': 'AC, AP, AM, PA, RO e RR',
        '3': 'CE, MA e PI',
        '4': 'AL, PB, PE e RN',
        '5': 'BA e SE',
        '6': 'MG',
        '7': 'ES e RJ',
        '8': 'SP',
        '9': 'PR e SC'
    };

    const regiaoEncontrada = regioes[nonoDigito] || "Dígito inválido";
    
    document.getElementById("resultado-regiao").innerText = regiaoEncontrada;
}