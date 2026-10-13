const ICONE_MOSTRAR = 'https://cdn0.iconfinder.com/data/icons/ui-icons-pack/100/ui-icon-pack-14-512.png';
const ICONE_OCULTAR = 'https://cdn0.iconfinder.com/data/icons/ui-icons-pack/100/ui-icon-pack-15-512.png';

function mostrarSenha() {
    const campoSenha = document.getElementById('login-password');
    const iconeOlho = document.getElementById('olho');
    campoSenha.type = 'text';
    iconeOlho.src = ICONE_OCULTAR;
}

function ocultarSenha() {
    const campoSenha = document.getElementById('login-password');
    const iconeOlho = document.getElementById('olho');
    campoSenha.type = 'password';
    iconeOlho.src = ICONE_MOSTRAR;
}

function alternarSenha() {
    const campoSenha = document.getElementById('login-password');
    if (campoSenha.type === 'password') {
        mostrarSenha();
        campoSenha.focus(); 
    } else {
        ocultarSenha();
    }
}

const iconeOlho = document.getElementById('olho');
const campoSenhaLogin = document.getElementById('login-password');

if (iconeOlho) {
    iconeOlho.removeAttribute('onmousedown');
    iconeOlho.removeAttribute('onmouseup');

    iconeOlho.addEventListener('mousedown', function (event) {
        event.preventDefault();
    });

    iconeOlho.addEventListener('click', alternarSenha);
}

if (campoSenhaLogin) {
    campoSenhaLogin.addEventListener('blur', ocultarSenha);
}