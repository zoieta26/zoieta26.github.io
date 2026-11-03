## Atualização de implantação — 03/11/2026: WSS pelo HTTPS da página

A configuração vigente utiliza `wss://ine5646.lucas.feitor.vms.ufsc.br/AA/AA9/ws`
na porta 443. O Apache encaminha para WSS com TLS na porta interna 8082.
O navegador usa somente o certificado HTTPS da página: não é necessário visitar
um segundo link para confiar no certificado da porta 8082. Se o certificado
HTTPS for autoassinado, permanece necessária a confiança inicial no próprio site.
Para eliminar esse aviso inicial, instale um certificado HTTPS de uma CA confiável.

O backend 8082 escuta somente em localhost. O Apache valida seu certificado
com `/etc/aa9/proxy.crt`, inclusive o nome DNS localhost. A chave privada permanece
em `/etc/aa9/proxy.key`, fora da área pública. O serviço lê os caminhos pelo
drop-in `/etc/systemd/system/aa9.service.d/proxy.conf`. O VirtualHost inclui
`/etc/apache2/aa9-proxy.inc` ANTES da exclusão ProxyPass `/AA` e do proxy geral
do VagaLink. O restante do VagaLink foi preservado.

Clientes continuam usando TCP real 8080 e UDP real 8081. Controles e mensagens
usam exclusivamente WSS, sem fetch. Não é necessário liberar 8082 externamente.

Para reaplicar esta integração nesta VM, execute como administrador:
`sudo bash /var/www/html/AA/AA9/deploy/usar-wss-443.sh`.
O script cria backup em `/var/backups/aa9`, mantém o certificado público 443,
valida o Apache e reinicia o backend; depois clique em Iniciar servidor.
O certificado interno dura 365 dias: renove-o mantendo SAN DNS localhost e IP
127.0.0.1, preserve as permissões e reinicie aa9/recarregue Apache.

As instruções históricas abaixo sobre conexão DIRETA do navegador à porta 8082
foram substituídas por esta atualização. O `default-ssl.conf` publicado mostra
a configuração atual com o bloco WSS expandido.

# AA9 — HTTPS, TCP, UDP e WebSocket seguro

Domínio informado: `ine5646.lucas.feitor.vms.ufsc.br`.
SSH informado: `lucas.feitor@ine5646.lucas.feitor.vms.ufsc.br`.
Autores: **Lucas Feitor e Thiago Coutinho da Silva**.

## Estado da entrega

Publicado e validado em 20/10/2026 na VPS informada. HTTPS, WSS na porta 8082,
clientes externos TCP 8080 e UDP 8081, comandos iniciar/parar/reiniciar e os URLs
das fontes foram verificados. Os autores constam no rodapé. O serviço é ativado
automaticamente no boot; os receptores foram deixados online após os testes.
O certificado é autoassinado: é necessário confiar nele no navegador para
HTTPS e WSS (veja a seção 3). Veja `TESTES.md` para evidências e limitações.

## Arquitetura e atendimento ao enunciado

```text
Navegador -- HTTPS/TLS :443 --> Apache --> index.html + CSS + JS + fontes
Navegador <-- WSS/TLS :8082 --> Python (server.py + server_manager.py)
Cliente TCP -- TCP :8080 ----> Python --> broadcast de mensagens pelo WSS
Cliente UDP -- UDP :8081 ----> Python --> broadcast de mensagens pelo WSS
```

O navegador usa exclusivamente `new WebSocket('wss://...:8082/AA/AA9/ws')`.
Iniciar, parar e consultar status também usam esse WSS; não há `fetch` nem WS
sem TLS. Browsers não abrem sockets TCP/UDP brutos: os clientes Python enviam
ao servidor e a página HTTPS recebe as mensagens retransmitidas por WSS.

O serviço WSS permanece em execução. O botão **Iniciar servidor** abre os dois
receptores; **Parar servidor** fecha os receptores e suas conexões TCP, mantendo
o canal de controle. Essa adaptação elimina CGI, PID files e processos disparados
pelo Apache. O módulo `server_manager.py` gerencia os sockets no mesmo processo.
Não há encerramento automático por inatividade; não foi solicitado na avaliação.

São exibidos protocolo, IP/porta do cliente, data/hora, filtro, contadores,
estados de início/parada/verificação, indicador verde/vermelho e depuração opcional.
Data/hora são transportadas em UTC e exibidas no fuso do navegador. Limpar apaga
somente as mensagens e os contadores da página atual. Reconectar não recupera
histórico: mensagens recebidas durante uma desconexão ficam apenas nos logs.
Sem WSS, o status é indisponível; isso não prova que os receptores estejam parados.

## Arquivos

`index.html`, `css/ws.css`, `js/wss.js`, `favicon.ico`, `py/server.py`,
`py/server_manager.py`, `Clients/tcp_client.py`, `Clients/udp_client.py`,
`000-default.conf`, `default-ssl.conf`, `deploy/aa9.service`, `requirements.txt`,
`ENTREGA.txt`, este README e `TESTES.md`. O pacote inclui `deploy/install.sh`
e dependências binárias em `deploy/wheels/` para Linux x86_64 / Python 3.12.

Para uma VPS dedicada com essa plataforma, o instalador reproduz o roteiro:
`sudo bash deploy/install.sh`. Ele preserva backups em `/var/backups/aa9-*`.
Na implantação atual, o backup das configurações anteriores está em
`/var/backups/aa9-20261021-002701` (nome registrado no relógio UTC da VPS).
O instalador utiliza os wheels locais quando presentes. Em outra plataforma,
remova apenas a cópia desses wheels no pacote de instalação e use o pip online
ou obtenha os binários compatíveis. Nenhuma credencial integra o pacote.

## 1. Copiar para a VPS

Pré-requisitos: VPS Debian/Ubuntu com Python 3.10+, sudo, DNS apontando para ela
e portas disponíveis. O roteiro abaixo permite reproduzir a implantação.

No PowerShell, a partir da pasta que contém o ZIP:

```powershell
scp .\AA9.zip lucas.feitor@ine5646.lucas.feitor.vms.ufsc.br:~/AA9.zip
ssh lucas.feitor@ine5646.lucas.feitor.vms.ufsc.br
```

Na VPS:

```bash
sudo apt update
sudo apt install apache2 python3 python3-venv openssl unzip
mkdir -p ~/aa9-upload
unzip ~/AA9.zip -d ~/aa9-upload
# O ZIP contém a pasta AA9/.
cd ~/aa9-upload/AA9
nano index.html  # conferir os autores no footer
nano README.md  # conferir os mesmos autores

# Preservar o site anterior antes de copiar.
BACKUP="/var/backups/aa9-$(date +%Y%m%d-%H%M%S)"
sudo mkdir -p "$BACKUP"
sudo cp -a /etc/apache2/sites-available/000-default.conf "$BACKUP/"
if [ -f /etc/apache2/sites-available/default-ssl.conf ]; then
  sudo cp -a /etc/apache2/sites-available/default-ssl.conf "$BACKUP/"
fi
if [ -d /var/www/html/AA/AA9 ]; then
  sudo cp -a /var/www/html/AA/AA9 "$BACKUP/site-AA9"
fi
sudo mkdir -p /var/www/html/AA/AA9
sudo cp -a . /var/www/html/AA/AA9/
sudo chown -R root:root /var/www/html/AA/AA9
sudo find /var/www/html/AA/AA9 -type d -exec chmod 755 {} \;
sudo find /var/www/html/AA/AA9 -type f -exec chmod 644 {} \;
```

Em uma VPS com outros sites, incorpore o bloco de diretório AA9 ao VirtualHost
HTTPS existente em vez de substituir suas configurações globais. Os modelos
fornecidos pressupõem uma VPS dedicada a este domínio.

## 2. Usuário e dependência

```bash
getent group aa9-tls >/dev/null || sudo groupadd --system aa9-tls
id aa9 >/dev/null 2>&1 || sudo useradd --system --user-group --no-create-home --shell /usr/sbin/nologin aa9
sudo mkdir -p /opt/aa9
sudo python3 -m venv /opt/aa9/venv
sudo /opt/aa9/venv/bin/python -m pip install -r /var/www/html/AA/AA9/requirements.txt
```

Se a consulta ao índice pip não encontrar os pacotes (como ocorreu na VPS),
use os wheels incluídos, compatíveis com a plataforma desta implantação:

```bash
sudo /opt/aa9/venv/bin/python -m pip install --no-index \
  --find-links /var/www/html/AA/AA9/deploy/wheels \
  -r /var/www/html/AA/AA9/requirements.txt
```

## 3. Certificado TLS compartilhado por Apache e WSS

Prefira um certificado confiável emitido para o domínio. Os modelos usam
`/etc/apache2/ssl/apache.crt` e `apache.key`: instale nesses caminhos a cadeia
completa e a chave correspondentes, ou adapte os dois caminhos no Apache e as
variáveis `AA9_CERT`/`AA9_KEY` no serviço systemd. A renovação exige recarregar
Apache e reiniciar `aa9`. A chave nunca deve ficar em `/var/www/html`.

Para o certificado autoassinado aceito no material do professor, execute
**apenas se os dois arquivos ainda não existirem**, sem substituir um certificado
existente. Se somente um existir, corrija o par antes de continuar:

```bash
sudo install -d -m 750 -o root -g aa9-tls /etc/apache2/ssl
if ! sudo test -e /etc/apache2/ssl/apache.crt && ! sudo test -e /etc/apache2/ssl/apache.key; then
  sudo openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 365 \
    -keyout /etc/apache2/ssl/apache.key -out /etc/apache2/ssl/apache.crt \
    -subj '/CN=ine5646.lucas.feitor.vms.ufsc.br' \
    -addext 'subjectAltName=DNS:ine5646.lucas.feitor.vms.ufsc.br'
fi
sudo chown root:aa9-tls /etc/apache2/ssl/apache.key
sudo chmod 640 /etc/apache2/ssl/apache.key
sudo chmod 644 /etc/apache2/ssl/apache.crt
sudo -u aa9 -g aa9-tls test -r /etc/apache2/ssl/apache.key
```

Autoassinado requer confiar no certificado no computador avaliador. Caso o
navegador permita exceções, visite tanto `https://DOMINIO/` quanto
`https://DOMINIO:8082/`, confira o certificado e aceite cada origem. Depois
reabra a página da atividade. Não há fallback para WS inseguro.

## 4. Ativar Apache e serviço

```bash
sudo a2enmod ssl mime
sudo cp /var/www/html/AA/AA9/000-default.conf /etc/apache2/sites-available/000-default.conf
sudo cp /var/www/html/AA/AA9/default-ssl.conf /etc/apache2/sites-available/default-ssl.conf
sudo a2ensite default-ssl
sudo apache2ctl configtest
# Recarregar somente se o comando anterior indicar Syntax OK.
sudo systemctl reload apache2
sudo cp /var/www/html/AA/AA9/deploy/aa9.service /etc/systemd/system/aa9.service
sudo systemctl daemon-reload
sudo systemctl enable --now aa9
sudo systemctl status aa9 --no-pager
```

Os arquivos Python da atividade são disponibilizados como texto, sem execução
CGI. Não habilite um handler CGI global que se sobreponha a esse diretório.
O Apache serve HTTPS em 443; o Python termina TLS diretamente em 8082.

## 5. Firewall

No firewall da VPS **e** nas regras de rede da UFSC, liberar entrada TCP 80, 443,
8080 e 8082; UDP 8081. A porta 8081/TCP não substitui 8081/UDP.
Se UFW já estiver ativo, aplicar:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 8081/udp
sudo ufw allow 8082/tcp
sudo ufw status
```

Não ative o firewall sem preservar a regra da porta SSH utilizada pela VPS.

## 6. Roteiro de avaliação por rede externa

1. Abra `https://ine5646.lucas.feitor.vms.ufsc.br/AA/AA9/` e verifique TLS/WSS.
2. Clique em iniciar: indicador verde e **Servidor online**. Em DevTools,
   confirme a conexão `wss://...:8082/AA/AA9/ws` com handshake 101.
3. Em outro terminal, execute os clientes abaixo, idealmente por outra rede:

```bash
python3 Clients/tcp_client.py --message 'Teste TCP externo'
python3 Clients/udp_client.py --message 'Teste UDP externo'
# Sem --message, os clientes são interativos. No Windows, use python no lugar de python3.
```

4. Verifique ACKs, duas mensagens na página, flags, IP/porta, data/hora,
   contadores TCP=1, UDP=1, total=2; teste cada filtro e o painel de depuração.
5. Abra uma segunda página e confirme transmissão para ambas. Consultas
   periódicas de status não devem desconectar o WSS.
6. Clique em limpar: zera somente a página atual. Clique em parar: indicador
   vermelho, TCP recusado e UDP sem ACK. Reinicie e teste os dois novamente.
7. Abra todos os URLs de `ENTREGA.txt`: fontes devem aparecer como texto e
   README deve estar acessível. Confira footer com todos os integrantes.
8. Cole na atividade os URLs de `ENTREGA.txt` após verificar disponibilidade.

## Diagnóstico

```bash
sudo journalctl -u aa9 -n 80 --no-pager
sudo ss -lntup | grep -E ':(443|8080|8081|8082)\b'
sudo tail -n 50 /var/log/apache2/aa9-error.log
```

Antes de clicar em iniciar, 8080/8081 fechadas são esperadas. `Address already in
use` indica outro processo nessas portas. Se UDP não puder abrir, o início
reverte a abertura TCP e informa erro à página. Falha de leitura da chave exige
conferir o grupo `aa9-tls`, os caminhos e permissões de todos os diretórios.
O log do serviço registra as mensagens recebidas mesmo sem navegador conectado.

## Protocolo e limites

TCP usa UTF-8 delimitado por nova linha, até 4096 bytes por mensagem. Por
compatibilidade com o exemplo original, dados sem nova linha são emitidos após
150 ms sem novos bytes ou no EOF; esse modo é heurístico, pois TCP é um fluxo.
Clientes próprios usam nova linha, permitindo fragmentação e várias mensagens
na mesma conexão. Resposta: `OK TCP`. UDP emite um evento por datagrama, limita
a exibição aos primeiros 4096 bytes e responde `OK UDP`; não garante entrega.
`exit`/`quit` são mensagens normais: encerram o cliente, nunca todo o servidor.
Buffer de saída WSS: 256 eventos por navegador; consumidores lentos são fechados.
A página mantém 500 mensagens e 200 linhas de depuração; não há banco de dados.

Os controles são abertos aos visitantes da origem HTTPS autorizada, conforme a
atividade. Não há autenticação de operadores; qualquer visitante dessa página
pode iniciar/parar os receptores. A verificação Origin evita páginas de outras
origens no navegador, mas não autentica clientes externos capazes de forjá-la.

## Origem e referências

Material-base consultado: [pasta WSS do professor](https://arquivos.ufsc.br/d/f0f79793510e4c71ae1d/).
O endereço colado no enunciado continha a URL duplicada; a pasta acima é a
origem válida consultada. O favicon foi preservado do material. A implementação
completa substitui os trechos `Implemente o restante`; os clientes foram
reescritos para também funcionar no Windows, sem SIGALRM.

Referências técnicas: [asyncio streams](https://docs.python.org/3/library/asyncio-stream.html),
[aiohttp WebSocketResponse e TLS](https://docs.aiohttp.org/en/stable/web_reference.html).
