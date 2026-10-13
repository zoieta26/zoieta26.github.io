// =========================================================
// 1. CLASSES CPF E CONTA
// =========================================================

class CPF {
    constructor(valor) {
        if (!valor || valor.trim() === '') {
            throw new Error('O campo CPF não pode estar vazio.');
        }

        const cpfLimpo = valor.replace(/[.\-\s]/g, '');

        if (!/^\d+$/.test(cpfLimpo)) {
            throw new Error('O CPF deve conter apenas dígitos numéricos.');
        }

        if (cpfLimpo.length !== 11) {
            throw new Error('O CPF deve ter exatamente 11 dígitos.');
        }

        if (/^(\d)\1{10}$/.test(cpfLimpo)) {
            throw new Error('CPF inválido (todos os dígitos são iguais).');
        }

        let soma = 0;
        for (let i = 0; i < 9; i++) {
            soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
        }
        let resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpfLimpo.charAt(9))) {
            throw new Error('CPF inválido (erro no 1º dígito verificador).');
        }

        soma = 0;
        for (let i = 0; i < 10; i++) {
            soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
        }
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpfLimpo.charAt(10))) {
            throw new Error('CPF inválido (erro no 2º dígito verificador).');
        }

        this.numero = cpfLimpo;
    }
}

class Conta {
    constructor(nome, sobrenome, cpf, email, senha) {
        this.nome = nome;
        this.sobrenome = sobrenome;
        this.cpf = cpf;
        this.email = email;
        this.senha = senha;
    }
}


// =========================================================
// 2. ELEMENTOS DA PÁGINA E BANCO DE DADOS (localStorage)
// =========================================================

const divHome = document.getElementById('divHome');
const divLogin = document.getElementById('login-body');
const divNovaConta = document.getElementById('nova-conta');

// Cria dinamicamente a Div da aba de Perfil dentro do <main>
const divPerfil = document.createElement('div');
divPerfil.id = 'divPerfil';
divPerfil.style.display = 'none';
document.querySelector('main').appendChild(divPerfil);

// Campos de Login
const inputsLogin = divLogin.querySelectorAll('input');
const inputEmailLogin = inputsLogin[0];
const inputSenhaLogin = document.getElementById('login-password');
const checkboxManterConectado = inputsLogin[2];
const botaoLogin = document.getElementById('botaoLogin');

// Cria um parágrafo para exibir erro de login 
const msgErroLogin = document.createElement('p');
msgErroLogin.style.gridColumn = '1 / 4';
msgErroLogin.style.textAlign = 'center';
msgErroLogin.style.color = '#ff6b6b';
msgErroLogin.style.marginTop = '5px';
divLogin.querySelector('form').appendChild(msgErroLogin);

// Campos de Criar Nova Conta
const inputsConta = divNovaConta.querySelectorAll('form > input');
const inputNome = inputsConta[0];
const inputSobrenome = inputsConta[1];
const inputCPF = inputsConta[2];
const inputEmailConta = inputsConta[3];
const inputSenhaConta = inputsConta[4];
const inputRepitaSenha = inputsConta[5];
const botaoCriarConta = document.querySelector('#areaBotaoConta input[type="button"]');

let cpfInstanciado = null;


let contasCadastradas = JSON.parse(localStorage.getItem('contasAA6')) || [];
let usuarioLogado = null;


// =========================================================
// 3. CONTROLE DE EXIBIÇÃO DAS TELAS (display: none)
// =========================================================

function mostrarApenasHome() {
    divHome.style.display = 'block';
    divLogin.style.display = 'none';
    divNovaConta.style.display = 'none';
    divPerfil.style.display = 'none';
}

function mostrarApenasLogin() {
    divHome.style.display = 'none';
    divNovaConta.style.display = 'none';
    divPerfil.style.display = 'none';
    divLogin.style.display = 'block';
    resetarLogin();
}

function mostrarApenasConta() {
    divHome.style.display = 'none';
    divLogin.style.display = 'none';
    divPerfil.style.display = 'none';
    divNovaConta.style.display = 'block';
    resetarConta();
}

function mostrarApenasPerfil() {
    if (!usuarioLogado) return;

    divHome.style.display = 'none';
    divLogin.style.display = 'none';
    divNovaConta.style.display = 'none';
    divPerfil.style.display = 'block';

    const nomeCompleto = `${usuarioLogado.nome} ${usuarioLogado.sobrenome}`.trim();

    divPerfil.innerHTML = `
        <h1><i class="menuIcon material-icons" style="vertical-align: middle; font-size: 32px;">person</i> Meu Perfil</h1>
        <div style="margin-top: 20px; padding: 20px; border: 1px solid #ccc; border-radius: 8px; max-width: 450px; background-color: #f9f9f9;">
            <p style="margin-bottom: 12px;"><strong>Nome:</strong> ${nomeCompleto}</p>
            <p style="margin-bottom: 12px;"><strong>E-mail:</strong> ${usuarioLogado.email}</p>
            <p><strong>Status da sessão:</strong> <span class="status-ok">Conectado</span></p>
        </div>
    `;
}


// =========================================================
// 4. TELA DE LOGIN, PERFIL E BOTÃO LOGOUT
// =========================================================

function emailTemUmArroba(email) {
    const partes = email.trim().split('@');
    return partes.length === 2 && partes[0].length > 0 && partes[1].length > 0;
}

function resetarLogin() {
    inputEmailLogin.value = '';
    inputSenhaLogin.value = '';
    checkboxManterConectado.checked = false;
    msgErroLogin.textContent = '';
    if (typeof ocultarSenha === 'function') {
        ocultarSenha();
    }
    botaoLogin.disabled = true;
}

function validarCamposLogin() {
    msgErroLogin.textContent = ''; // Limpa mensagem de erro ao digitar
    const emailOk = emailTemUmArroba(inputEmailLogin.value);
    const senhaOk = inputSenhaLogin.value.trim().length > 0;
    botaoLogin.disabled = !(emailOk && senhaOk);
}

inputEmailLogin.addEventListener('input', validarCamposLogin);
inputSenhaLogin.addEventListener('input', validarCamposLogin);


botaoLogin.addEventListener('click', function (event) {
    event.preventDefault();
    const emailDigitado = inputEmailLogin.value.trim();
    const senhaDigitada = inputSenhaLogin.value;

    
    const contaEncontrada = contasCadastradas.find(
        c => c.email.toLowerCase() === emailDigitado.toLowerCase()
    );

    if (!contaEncontrada) {
        msgErroLogin.textContent = 'Conta não encontrada. Crie uma conta primeiro!';
        return;
    }

    if (contaEncontrada.senha !== senhaDigitada) {
        msgErroLogin.textContent = 'Senha incorreta. Tente novamente!';
        return;
    }

    // Login válido!
    usuarioLogado = contaEncontrada;
    atualizarMenuUsuario(true);
    mostrarApenasHome();
});

function atualizarMenuUsuario(estaLogado) {
    const dropdown = document.getElementById('acountDropdown');
    const linksOriginais = dropdown.querySelectorAll('a:not(.item-logado), hr:not(.item-logado)');
    const itensLogado = dropdown.querySelectorAll('.item-logado');

    if (estaLogado) {
        linksOriginais.forEach(el => el.style.display = 'none');

        if (itensLogado.length === 0) {
            const linkPerfil = document.createElement('a');
            linkPerfil.href = '#';
            linkPerfil.className = 'item-logado';
            linkPerfil.textContent = 'Perfil';
            linkPerfil.onclick = function (e) {
                e.preventDefault();
                mostrarApenasPerfil();
            };

            const hr = document.createElement('hr');
            hr.className = 'item-logado';

            const linkLogout = document.createElement('a');
            linkLogout.href = '#';
            linkLogout.className = 'item-logado';
            linkLogout.textContent = 'Logout';
            linkLogout.onclick = function (e) {
                e.preventDefault();
                usuarioLogado = null;
                atualizarMenuUsuario(false);
                mostrarApenasHome();
            };

            dropdown.appendChild(linkPerfil);
            dropdown.appendChild(hr);
            dropdown.appendChild(linkLogout);
        }
    } else {
        itensLogado.forEach(el => el.remove());
        linksOriginais.forEach(el => el.style.display = '');
    }
}


// =========================================================
// 5. TELA DE CRIAÇÃO DE NOVA CONTA
// =========================================================

function definirStatus(idStatus, sucesso, msg = '') {
    const p = document.getElementById(idStatus);
    if (sucesso) {
        p.className = 'status-ok';
        p.innerHTML = `<i class="material-icons" style="font-size: 18px; vertical-align: middle;">check_circle</i> ${msg}`;
    } else {
        p.className = 'status-fail';
        p.textContent = msg;
    }
    return sucesso;
}

function validaTextoEmBranco(input, idStatus, nomeCampo) {
    let valido = false;
    if (input.value.trim() === '') {
        valido = definirStatus(idStatus, false, `${nomeCampo} não pode estar vazio.`);
    } else {
        valido = definirStatus(idStatus, true);
    }
    verificarBotaoCriarConta();
    return valido;
}

function validarCPF(input) {
    let valido = false;
    try {
        cpfInstanciado = new CPF(input.value);
        valido = definirStatus('statusCPF', true);
    } catch (erro) {
        cpfInstanciado = null;
        valido = definirStatus('statusCPF', false, erro.message);
    }
    verificarBotaoCriarConta();
    return valido;
}

function validarEmailConta() {
    const valor = inputEmailConta.value.trim();
    let valido = false;
    if (valor === '') {
        valido = definirStatus('statusEmail', false, 'E-mail não pode estar vazio.');
    } else if (!emailTemUmArroba(valor)) {
        valido = definirStatus('statusEmail', false, 'O e-mail deve conter uma e apenas uma @.');
    } else {
        valido = definirStatus('statusEmail', true);
    }
    verificarBotaoCriarConta();
    return valido;
}

function verificarForcaSenha(senha) {
    if (senha.length < 6) return '(Senha fraca)';
    if (senha.length >= 8 && /[A-Z]/.test(senha) && /[0-9]/.test(senha)) return '(Senha forte)';
    return '(Senha média)';
}

function validarSenhasConta() {
    const s1 = inputSenhaConta.value;
    const s2 = inputRepitaSenha.value;

    let s1Ok = false;
    let s2Ok = false;

    if (s1 === '') {
        s1Ok = definirStatus('statusSenha', false, 'A senha não pode estar vazia.');
    } else {
        s1Ok = definirStatus('statusSenha', true, verificarForcaSenha(s1));
    }

    if (s2 === '') {
        s2Ok = definirStatus('statusRepitaSenha', false, 'Repita a senha.');
    } else if (s1 !== s2) {
        s2Ok = definirStatus('statusRepitaSenha', false, 'As senhas não coincidem.');
    } else {
        s2Ok = definirStatus('statusRepitaSenha', true);
    }

    verificarBotaoCriarConta();
    return s1Ok && s2Ok;
}

function verificarBotaoCriarConta() {
    const nomeOk = inputNome.value.trim() !== '';
    const sobrenomeOk = inputSobrenome.value.trim() !== '';
    const cpfOk = cpfInstanciado !== null;
    const emailOk = emailTemUmArroba(inputEmailConta.value);
    const senhasOk = inputSenhaConta.value !== '' && inputSenhaConta.value === inputRepitaSenha.value;

    botaoCriarConta.disabled = !(nomeOk && sobrenomeOk && cpfOk && emailOk && senhasOk);
}

function resetarConta() {
    inputsConta.forEach(input => input.value = '');
    const statusIds = ['statusNome', 'statusSobrenome', 'statusCPF', 'statusEmail', 'statusSenha', 'statusRepitaSenha'];
    statusIds.forEach(id => {
        const p = document.getElementById(id);
        p.textContent = '';
        p.className = '';
    });
    cpfInstanciado = null;
    botaoCriarConta.disabled = true;
}

inputNome.addEventListener('input', () => validaTextoEmBranco(inputNome, 'statusNome', 'Nome'));
inputSobrenome.addEventListener('input', () => validaTextoEmBranco(inputSobrenome, 'statusSobrenome', 'Sobrenome'));
inputCPF.addEventListener('input', () => validarCPF(inputCPF));

inputEmailConta.addEventListener('blur', validarEmailConta);
inputEmailConta.addEventListener('input', validarEmailConta);

inputSenhaConta.addEventListener('blur', validarSenhasConta);
inputSenhaConta.addEventListener('input', validarSenhasConta);

inputRepitaSenha.addEventListener('blur', validarSenhasConta);
inputRepitaSenha.addEventListener('input', validarSenhasConta);

botaoCriarConta.addEventListener('click', function () {
    const novaConta = new Conta(
        inputNome.value.trim(),
        inputSobrenome.value.trim(),
        cpfInstanciado,
        inputEmailConta.value.trim(),
        inputSenhaConta.value
    );

        const indiceExistente = contasCadastradas.findIndex(
        c => c.email.toLowerCase() === novaConta.email.toLowerCase()
    );
    if (indiceExistente >= 0) {
        contasCadastradas[indiceExistente] = novaConta;
    } else {
        contasCadastradas.push(novaConta);
    }

    
    localStorage.setItem('contasAA6', JSON.stringify(contasCadastradas));

    
    console.log(novaConta);

    
    mostrarApenasLogin();
});


// =========================================================
// 6. INICIALIZAÇÃO DA PÁGINA
// =========================================================

mostrarApenasHome();