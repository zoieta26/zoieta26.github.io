function haOnzeDigitos(cpf) {
    
    return cpf.length === 11;
}

function todosOsOnzeDigitosSaoNumeros(cpf) {
    
    return /^\d{11}$/.test(cpf);
}

function osOnzeNumerosSaoDiferentes(cpf) {
    
    return !/^(\d)\1{10}$/.test(cpf);
}

function oPrimeiroDigitoVerificadorEhValido(cpf) {
    
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i), 10) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    
    return resto === parseInt(cpf.charAt(9), 10);
}

function oSegundoDigitoVerificadorEhValido(cpf) {
    
    let soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i), 10) * (11 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    
    return resto === parseInt(cpf.charAt(10), 10);
}



//------------------- Não edite abaixo ----------------------------
function validarCPF(validacao, cpf) {
    switch (validacao) {
        case "onzeDigitos": return haOnzeDigitos(cpf)
        case "onzeSaoNumeros": return todosOsOnzeDigitosSaoNumeros(cpf) && validarCPF("onzeDigitos", cpf)
        case "naoSaoTodosIguais": return osOnzeNumerosSaoDiferentes(cpf) && validarCPF("onzeSaoNumeros", cpf)
        case "verificador10": return oPrimeiroDigitoVerificadorEhValido(cpf) && validarCPF("naoSaoTodosIguais", cpf)
        case "verificador11": return oSegundoDigitoVerificadorEhValido(cpf) && validarCPF("verificador10", cpf)

        default:
            console.error(validacao+" é um botão desconhecido...")
            return false
    }
}


function tratadorDeCliqueExercicio9(nomeDoBotao) {
    const cpf = document.getElementById("textCPF").value

    const validacao = (nomeDoBotao === "validade") ? "verificador11": nomeDoBotao
    const valido = validarCPF(validacao, cpf)
    const validoString = valido ? "valido": "inválido"
    const validadeMensagem = "O CPF informado ("+cpf+") é "+ validoString
    console.log(validadeMensagem)

    if (nomeDoBotao !== "validade") {
        let divResultado = document.getElementById(validacao);
        divResultado.textContent = validoString
        divResultado.setAttribute("class", valido ? "divValidadeValido": "divValidadeInvalido")    
    } else {
        window.alert(validadeMensagem)
    }

    
}