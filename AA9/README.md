# AA9 — HTTPS, TCP, UDP e WebSocket seguro

**Autores:** Lucas Feitor e Thiago Coutinho da Silva — INE/UFSC.

Documentação da configuração validada em **03/11/2026**. O navegador utiliza
HTTPS e WSS na porta pública 443; o Python atende WSS com TLS na porta interna
8082, por meio do proxy Apache. Os clientes enviam mensagens por TCP real 8080
e UDP real 8081.

## Links para entregar

- Página: https://ine5646.lucas.feitor.vms.ufsc.br/AA/AA9/
- TCP: `ine5646.lucas.feitor.vms.ufsc.br:8080`
- UDP: `ine5646.lucas.feitor.vms.ufsc.br:8081`
- README: https://ine5646.lucas.feitor.vms.ufsc.br/AA/AA9/README.md
- Apache HTTP: https://ine5646.lucas.feitor.vms.ufsc.br/AA/AA9/000-default.conf
- Apache HTTPS: https://ine5646.lucas.feitor.vms.ufsc.br/AA/AA9/default-ssl.conf
- HTML: https://ine5646.lucas.feitor.vms.ufsc.br/AA/AA9/index.html
- CSS: https://ine5646.lucas.feitor.vms.ufsc.br/AA/AA9/css/ws.css
- JavaScript: https://ine5646.lucas.feitor.vms.ufsc.br/AA/AA9/js/wss.js
- Servidor: https://ine5646.lucas.feitor.vms.ufsc.br/AA/AA9/py/server.py
- Gerenciador: https://ine5646.lucas.feitor.vms.ufsc.br/AA/AA9/py/server_manager.py
- Cliente TCP: https://ine5646.lucas.feitor.vms.ufsc.br/AA/AA9/Clients/tcp_client.py
- Cliente UDP: https://ine5646.lucas.feitor.vms.ufsc.br/AA/AA9/Clients/udp_client.py
- Serviço: https://ine5646.lucas.feitor.vms.ufsc.br/AA/AA9/deploy/aa9.service
- Dependência: https://ine5646.lucas.feitor.vms.ufsc.br/AA/AA9/requirements.txt
- Fontes no GitHub: https://github.com/zoieta26/zoieta26.github.io/tree/main/AA9

Os endereços TCP e UDP são destinos dos clientes de terminal, não páginas HTTP.
O GitHub hospeda os fontes; a aplicação com sockets Python roda na VM UFSC.

## Arquitetura e funcionamento

```text
Navegador HTTPS/WSS :443 <--> Apache
                               |
                               +-- HTTPS: HTML, CSS, JS e fontes
                               |
                               +-- proxy WSS/TLS --> localhost:8082/AA/AA9/ws
                                                      Python server.py
                                                          |
                                        server_manager.py +-- TCP real :8080
                                                          +-- UDP real :8081
```

O JavaScript abre `wss://${location.host}/AA/AA9/ws`. O Apache encaminha essa
rota para `wss://localhost:8082/AA/AA9/ws`, validando o certificado interno e o
nome localhost. Há TLS nas duas conexões. A porta 8082 fica no loopback e não
precisa estar acessível aos visitantes. O navegador não abre sockets TCP/UDP
brutos: os clientes Python enviam ao servidor, que transmite os eventos pelo WSS.
Os comandos iniciar, parar e status também usam WSS; a AA9 não usa fetch nem
WebSocket sem TLS.

O serviço `aa9.service` mantém o canal de controle WSS em execução. **Iniciar
servidor** abre TCP 8080 e UDP 8081. **Parar servidor** fecha os receptores e
as conexões TCP, preservando o canal de controle. Após reiniciar o serviço ou
a VM, clique em Iniciar servidor para abrir novamente os receptores.
`server_manager.py` é um módulo do processo Python, não um CGI Apache.

O systemd controla o processo e o gerenciador usa um lock asyncio para
serializar início/parada. Por isso, esta implementação não usa arquivos PID,
lock ou uma pasta tmp. As mensagens e erros são registrados no journal do
serviço. Não há encerramento automático por inatividade; os prazos de
inatividade exibidos nos exemplos do enunciado não foram implementados.

## HTTPS e certificados

O visitante usa somente o certificado HTTPS da página na porta 443. Não é
necessário abrir um link adicional nem confiar em outro certificado da porta
8082. O certificado público desta implantação é autoassinado: o navegador do
avaliador pode mostrar um aviso enquanto não houver confiança configurada
nesse certificado. Um certificado de autoridade confiável para o hostname
elimina essa necessidade.

Na VM atual, o VirtualHost ativo é
`/etc/apache2/sites-available/vagalink-ufsc.conf`. Ele usa:

- HTTPS público: `/etc/apache2/ssl/vagalink/server.crt` e `server.key`;
- WSS interno: `/etc/aa9/proxy.crt` e `/etc/aa9/proxy.key`;
- proxy: `/etc/apache2/aa9-proxy.inc`;
- ambiente do serviço: `/etc/systemd/system/aa9.service.d/proxy.conf`.

As chaves privadas ficam fora de `/var/www/html`. O Apache confia explicitamente
no certificado interno; `SSLProxyVerify require` e `SSLProxyCheckPeerName On`
permanecem habilitados. A conexão interna usa o nome **localhost**, com
`ProxyPreserveHost Off` somente na rota WSS da AA9.

## Instalação e configuração

Roteiro para Debian/Ubuntu com Python 3.10+, Apache 2.4 e acesso administrativo.
Na VM atual, preserve o VirtualHost e o certificado HTTPS existentes do VagaLink.
O arquivo público `default-ssl.conf` é uma fotografia da configuração integrada,
incluindo rotas de outro projeto; não o ative como um segundo VirtualHost
concorrente do mesmo domínio. Este roteiro substitui as orientações antigas
dos scripts `deploy/install.sh` e `deploy/usar-wss-443.sh`; não os execute para
reaplicar a configuração atual.

### 1. Obter e copiar os fontes

No Git Bash ou em um terminal Linux, em uma pasta de trabalho:

```bash
git clone https://github.com/zoieta26/zoieta26.github.io.git portfolio-aa9
scp -r portfolio-aa9/AA9 ufsc:~/aa9-fontes
ssh ufsc
```

O alias `ufsc` é uma configuração deste computador. Em outro computador, use
`lucas.feitor@ine5646.lucas.feitor.vms.ufsc.br` ou seu usuário autorizado.
Se `~/aa9-fontes` já existir, use uma pasta nova e ajuste o caminho abaixo.

Na VM:

```bash
sudo apt-get update
sudo apt-get install -y apache2 python3-venv openssl

BACKUP="/var/backups/aa9-$(date +%Y%m%d-%H%M%S)"
sudo mkdir -p "$BACKUP"
sudo cp -a /etc/apache2/sites-available "$BACKUP/"
if [ -d /var/www/html/AA/AA9 ]; then
  sudo cp -a /var/www/html/AA/AA9 "$BACKUP/site-AA9"
fi
if [ -f /etc/systemd/system/aa9.service ]; then
  sudo cp -a /etc/systemd/system/aa9.service "$BACKUP/"
fi
if [ -d /etc/systemd/system/aa9.service.d ]; then
  sudo cp -a /etc/systemd/system/aa9.service.d "$BACKUP/"
fi
if [ -f /etc/apache2/aa9-proxy.inc ]; then
  sudo cp -a /etc/apache2/aa9-proxy.inc "$BACKUP/"
fi

sudo mkdir -p /var/www/html/AA/AA9
sudo cp -a ~/aa9-fontes/. /var/www/html/AA/AA9/
sudo chown -R root:root /var/www/html/AA/AA9
sudo find /var/www/html/AA/AA9 -type d -exec chmod 755 {} \;
sudo find /var/www/html/AA/AA9 -type f -exec chmod 644 {} \;
```

O favicon existente pode ser mantido; ele não participa da comunicação.

### 2. Usuário e dependência Python

```bash
getent group aa9-tls >/dev/null || sudo groupadd --system aa9-tls
id aa9 >/dev/null 2>&1 || sudo useradd --system --user-group --no-create-home --shell /usr/sbin/nologin aa9
sudo mkdir -p /opt/aa9
sudo python3 -m venv /opt/aa9/venv
sudo /opt/aa9/venv/bin/python -m pip install -r /var/www/html/AA/AA9/requirements.txt
```

O requisito é `aiohttp==3.14.5`. Se o pip da VM não alcançar o índice, obtenha
wheels compatíveis com o Python e a arquitetura da VM em outro computador e use
`pip install --no-index --find-links /caminho/dos/wheels -r requirements.txt`.
O diretório de wheels não integra os fontes atualmente enviados ao GitHub.

### 3. Certificado interno e serviço

Crie o par interno apenas se ambos os arquivos ainda não existirem. Se houver
apenas um deles, corrija o par antes de continuar. Não sobrescreva certificados
existentes durante uma reinstalação.

```bash
sudo install -d -m 755 /etc/aa9
if ! sudo test -e /etc/aa9/proxy.crt && ! sudo test -e /etc/aa9/proxy.key; then
  sudo openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 365 \
    -subj '/CN=localhost' \
    -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' \
    -addext 'basicConstraints=critical,CA:TRUE' \
    -keyout /etc/aa9/proxy.key -out /etc/aa9/proxy.crt
fi
sudo chown root:aa9 /etc/aa9/proxy.key
sudo chmod 640 /etc/aa9/proxy.key
sudo chmod 644 /etc/aa9/proxy.crt
sudo -u aa9 test -r /etc/aa9/proxy.key

sudo install -m 644 /var/www/html/AA/AA9/deploy/aa9.service /etc/systemd/system/aa9.service
sudo install -d /etc/systemd/system/aa9.service.d
sudo tee /etc/systemd/system/aa9.service.d/proxy.conf >/dev/null <<'EOF'
[Service]
Environment=AA9_CERT=/etc/aa9/proxy.crt
Environment=AA9_KEY=/etc/aa9/proxy.key
Environment=AA9_WS_HOST=localhost
EOF
```

O `server.py` entregue lê `AA9_WS_HOST`, `AA9_CERT` e `AA9_KEY`. O arquivo base
`deploy/aa9.service` e esse drop-in formam juntos a configuração do serviço.

### 4. Apache: integrar ao HTTPS existente

```bash
sudo a2enmod ssl headers rewrite mime proxy proxy_http proxy_wstunnel
sudo tee /etc/apache2/aa9-proxy.inc >/dev/null <<'EOF'
SSLProxyEngine On
SSLProxyVerify require
SSLProxyCheckPeerName On
SSLProxyCACertificateFile /etc/aa9/proxy.crt
ProxyPass "/AA/AA9/ws" "wss://localhost:8082/AA/AA9/ws" timeout=3600
ProxyPassReverse "/AA/AA9/ws" "wss://localhost:8082/AA/AA9/ws"
<Location "/AA/AA9/ws">
    ProxyPreserveHost Off
</Location>
EOF
```

No VirtualHost HTTPS do hostname, insira **uma única vez**, antes de
`ProxyPass "/AA" "!"` e de qualquer proxy geral `/`:

```apache
Include /etc/apache2/aa9-proxy.inc
```

Esse VirtualHost deve servir `/var/www/html` e conter o bloco abaixo. Na VM
atual ele já existe; não o duplique:

```apache
<Directory /var/www/html/AA/AA9>
    Options -Indexes -ExecCGI
    AllowOverride None
    Require all granted
    DirectoryIndex index.html
    AddType text/plain .py .conf .md .service .sh .txt
    RemoveHandler .py
    <FilesMatch "\.py$">
        SetHandler default-handler
        ForceType text/plain
    </FilesMatch>
</Directory>
```

Em uma VM nova sem HTTPS configurado, crie primeiro um VirtualHost `*:443`
com `ServerName ine5646.lucas.feitor.vms.ufsc.br`, `DocumentRoot /var/www/html`,
`SSLEngine On`, `SSLProtocol -all +TLSv1.2 +TLSv1.3`,
`SSLCertificateFile` e `SSLCertificateKeyFile` apontando para um par válido para
esse hostname. Insira nele o Include e o bloco Directory acima e habilite o site
com `a2ensite`. O certificado público é independente do certificado interno
de localhost. Na porta 80, redirecione a AA9 para HTTPS, preservando as exceções
necessárias dos outros sites. Na VM desta entrega, isso já está configurado.

Valide antes de recarregar:

```bash
sudo apache2ctl configtest
# Continue somente se retornar Syntax OK.
sudo systemctl daemon-reload
sudo systemctl enable aa9
sudo systemctl restart aa9
sudo systemctl reload apache2
sudo systemctl status aa9 --no-pager
```

Abra a página e clique em **Iniciar servidor**. O reinício do serviço deixa os
receptores parados até esse comando. Não é necessário reiniciar a aplicação
VagaLink para fazer essa integração.

### 5. Rede e renovação

Nas regras da VM e da infraestrutura UFSC, permita 443/TCP, 8080/TCP e 8081/UDP.
80/TCP é usado pelo redirecionamento HTTP e por eventual validação ACME.
Preserve o acesso SSH. Não é necessário expor 8082: ela atende apenas no loopback.
8081/TCP não substitui 8081/UDP. Esta VM não possui UFW instalado; não use
comandos UFW como evidência de que suas portas foram liberadas.

Os testes externos desta entrega passaram em IPv4. O hostname também publica
IPv6; acesso TCP pela rota IPv6 não foi confirmado. Se houver demora no cliente
TCP, ele pode estar tentando IPv6 antes de usar IPv4. Na validação atual, o IPv4
resolvido foi `150.162.244.210`; consulte o DNS novamente antes de usar o IP
diretamente em um teste futuro.

O certificado interno foi emitido por 365 dias. Renove-o antes de vencer,
preservando SAN DNS localhost e as permissões, depois reinicie `aa9` e recarregue
o Apache. A renovação do certificado HTTPS público exige recarregar o Apache;
ela não precisa alterar o certificado interno.

## Roteiro de teste para o professor

1. Conecte-se à rede/VPN da UFSC quando necessário para alcançar a VM e abra
   a página HTTPS. Confirme **WSS conectado · TLS ativo**. No painel de rede do
   navegador, a URL deve ser `wss://ine5646.lucas.feitor.vms.ufsc.br/AA/AA9/ws`
   na porta 443, com handshake 101.
2. Clique em Iniciar servidor se estiver offline. Confirme o indicador verde.
3. Baixe os clientes `Clients/` e execute em outro terminal:

   ```bash
   python Clients/tcp_client.py --message "Teste TCP externo"
   python Clients/udp_client.py --message "Teste UDP externo"
   ```

   No Linux, use `python3` se necessário. Sem `--message`, o cliente abre um
   prompt interativo. O hostname e as portas da entrega já são os padrões;
   `host`, `--port` e `--message` são os argumentos aceitos pelos scripts.

4. Confirme `OK TCP`, `OK UDP` e as duas mensagens na página, incluindo flags,
   IP/porta e data/hora. Após limpar a lista e enviar uma de cada protocolo,
   os contadores devem indicar TCP=1, UDP=1, total=2.
5. Teste Todas/TCP/UDP e Exibir/Ocultar informações de depuração. Abra uma
   segunda página e confirme o broadcast das novas mensagens para ambas.
6. Limpar mensagens zera somente a lista e os contadores daquele navegador.
   Parar servidor fecha TCP/UDP e deixa WSS conectado para permitir reiniciar.
7. Abra os links desta documentação. Python deve aparecer como texto, sem CGI.
   Confira os dois nomes dos autores no rodapé. Envie na atividade a página,
   os destinos TCP/UDP, o README e os links de implementação.

## Validação realizada e limites

Em 03/11/2026 foram verificados deste computador, contra a VM pela rede:

- HTTPS 200 na página, README, configurações, JavaScript e fontes Python/clientes;
- conexão WSS pública pela porta 443 com validação explícita do certificado
  autoassinado apresentado pela VM, sem desligar a validação TLS;
- envio TCP externo IPv4 8080, ACK e evento correspondente recebido no WSS;
- envio UDP externo IPv4 8081, ACK e evento correspondente recebido no WSS;
- comandos WSS iniciar, parar e reiniciar;
- abertura pelo botão do portfólio e estado online/WSS conectado no navegador;
- remoção do link de certificado da porta 8082.

Isso confirma o acesso pela rede usada no teste; não garante acesso por todas as
redes de terceiros. Os relatórios históricos `TESTES.md` e `ENTREGA.txt`, quando
presentes na VM, podem conter referências à implantação anterior. As URLs e a
arquitetura vigentes são as deste README.

## Protocolo, interface e diagnóstico

TCP usa UTF-8 e nova linha, até 4096 bytes por mensagem. O servidor também aceita
o cliente original sem nova linha: publica o buffer após 150 ms sem novos bytes
ou no EOF. Esse modo é heurístico, pois TCP é um fluxo. UDP produz um evento
por datagrama, exibe até 4096 bytes e responde `OK UDP`; não garante entrega.
`exit`/`quit` encerram o cliente, não o servidor.

A página mantém até 500 mensagens e 200 linhas de depuração. Os contadores
incluem as mensagens recebidas desde a abertura ou a última limpeza da página.
Datas são transmitidas em UTC e exibidas no fuso do navegador. Reconectar não
recupera histórico. A fila de saída limita-se a 256 eventos por navegador;
consumidores lentos são desconectados. Não há banco de dados. Os controles são
públicos aos visitantes da origem HTTPS autorizada; Origin não é autenticação.

```bash
sudo systemctl status aa9 --no-pager
sudo systemctl cat aa9
sudo journalctl -u aa9 -n 80 --no-pager
sudo apache2ctl configtest
sudo apache2ctl -S
sudo tail -n 50 /var/log/apache2/vagalink/ssl-error.log
sudo ss -lntup | grep -E ':(443|8080|8081|8082)\b'
```

8080/8081 fechadas antes de clicar em iniciar são esperadas. Falha ao abrir UDP
reverte a abertura TCP. Em erro TLS do proxy, confira SAN DNS localhost,
`wss://localhost:8082`, `ProxyPreserveHost Off` na rota AA9, a CA interna, a ordem
das regras ProxyPass e as permissões de leitura da chave pelo usuário `aa9`.
Não desabilite a verificação de certificados para contornar o erro.

## Material-base e referências

Material-base: https://arquivos.ufsc.br/d/f0f79793510e4c71ae1d/.
Os esqueletos Python foram completados; os clientes funcionam em Windows/Linux
sem SIGALRM. A estrutura de execução usa systemd e o gerenciador no próprio WSS.

Referências: [asyncio streams](https://docs.python.org/3/library/asyncio-stream.html),
[aiohttp](https://docs.aiohttp.org/en/stable/web_reference.html) e
[Apache mod_ssl](https://httpd.apache.org/docs/2.4/mod/mod_ssl.html).
