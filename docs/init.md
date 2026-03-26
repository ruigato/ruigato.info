Tenho este site feito em WordPress e está alojado na domínios.pt e eu quero saber se é possível eu passar a alojar localmente o site a partir aqui do meu servidor local e manter o site em WordPress exatamente como ele está. Portanto, o que é que eu tenho que fazer? Tenho que fazer download dos ficheiros todos do site e depois como é que posso recriar, talvez com Cloudflare ou se calhar é preciso Superbase, Diz-me o que achas.

Vou confirmar rapidamente o que o Cloudflare e o Supabase suportam hoje para este cenário, porque isso influencia bastante a recomendação.

Thought for 20s

Sim, é possível manter o site em WordPress exatamente como está e passar a alojá-lo no teu servidor local. O que muda é o servidor de origem; o WordPress continua a ser WordPress, com a mesma base de dados, ficheiros, media, tema e plugins.

A resposta curta é esta: não precisas de Supabase para isso. O caminho normal é:

copiar ficheiros + base de dados do site atual,
montar no teu servidor local um ambiente com web server + PHP + MySQL/MariaDB,
apontar o domínio para esse novo servidor,
idealmente pôr Cloudflare à frente para DNS, SSL, cache e proteção.
O que tens mesmo de migrar

Precisas de duas coisas:

ficheiros do WordPress
Inclui a pasta wp-content inteira, mais os restantes ficheiros do core e o wp-config.php.
base de dados MySQL/MariaDB
É aí que estão posts, páginas, menus, settings, utilizadores, etc.

Sem uma destas partes, o site não fica igual.

O que montar no teu servidor local

No teu servidor local precisas de:

Nginx ou Apache
PHP compatível com a tua versão de WordPress/plugins
MySQL ou MariaDB
Certificados SSL
sistema de backups
proteção básica e updates

O WordPress continua a funcionar normalmente nesse ambiente.

Cloudflare ou Supabase?

Cloudflare: faz sentido, e bastante.
Podes usá-lo para:

gerir DNS, se mudares os nameservers para Cloudflare;
servir de reverse proxy/cache;
WAF/proteção;
SSL entre visitantes e Cloudflare, e também entre Cloudflare e o teu servidor de origem com Origin CA.

Supabase: não é a ferramenta certa para alojar um WordPress tradicional.
Supabase é sobretudo backend Postgres/Auth/Storage/APIs. Pode ser útil noutros projetos teus, mas não é a peça natural para migrar um WordPress PHP+MySQL.

Cenários possíveis
Opção A — servidor local com IP público

Se o teu servidor local tiver IP público fixo e conseguires abrir portas no router:

apontas o domínio para esse IP,
configuras o servidor web,
e podes pôr Cloudflare à frente.

É o cenário mais direto.

Opção B — servidor local sem exposição direta

Se não quiseres abrir portas ou não tiveres IP fixo, podes usar Cloudflare Tunnel para expor o site sem abrir portas inbound. Para muitos cenários domésticos isto é bastante mais cómodo. Cloudflare também funciona como reverse proxy do tráfego.

O papel da domínios.pt

Não precisas de tirar o domínio da domínios.pt. Podes:

manter o domínio lá e alterar apenas os registos DNS (A, CNAME, etc.); ou
trocar os nameservers para os da Cloudflare, se quiseres que a Cloudflare passe a ser o teu DNS autoritativo. A domínios.pt permite tanto editar registos DNS como alterar nameservers.
Processo recomendado
1. Fazer cópia do site atual

Exporta:

todos os ficheiros do site
dump da base de dados
2. Montar um ambiente de teste local

Antes de mexer no domínio, monta o site internamente num URL temporário ou só por IP interno.

3. Ajustar o wp-config.php

Terás de atualizar:

nome da base de dados
utilizador
password
host da BD
4. Rever URLs

Se o domínio final se mantiver o mesmo, idealmente manténs siteurl e home iguais.
Se testares noutro endereço, convém depois fazer search/replace cuidadoso nas URLs internas.

5. Verificar uploads, permalinks, plugins e mail

É comum falhar aqui:

permissões de ficheiros
regras de rewrite/permalinks
envio de email SMTP
cron jobs do WordPress
cache e plugins de segurança
6. Só depois mudar DNS

Quando o teste estiver validado, mudas:

registos DNS na domínios.pt, ou
nameservers para Cloudflare.
O que eu faria no teu caso

Eu seguiria esta arquitetura:

WordPress continua igual
servidor local como origin
Cloudflare à frente
domínio mantido na domínios.pt, mas com:
ou nameservers da Cloudflare,
ou DNS na domínios.pt a apontar para o servidor

E evitaria Supabase neste projeto.

Riscos reais de alojar em casa/no teu servidor

Antes de mudares, convém ter consciência destes pontos:

falha de eletricidade = site offline
falha de internet local = site offline
IP dinâmico pode complicar
segurança passa a ser muito mais tua responsabilidade
backups e monitorização deixam de vir do alojamento
tens de manter PHP, MySQL, sistema operativo e WordPress atualizados

Se o objetivo é controlo total, faz sentido.
Se o objetivo é só “sair da domínios.pt porque está limitado”, muitas vezes compensa mais um VPS externo do que alojar em casa.

Conclusão

Sim, dá para fazer exatamente como queres.
O essencial é:

exportar ficheiros + base de dados
recriar o ambiente WordPress no teu servidor
usar Cloudflare para DNS/proxy/SSL/proteção
não usar Supabase para este caso

Se quiseres, no passo seguinte eu posso dar-te um plano técnico exato de migração, em ordem, para o teu caso: backup, montagem local, teste, DNS e passagem final sem downtime.

Ok, percebi e sim, o objetivo é ter controlo total do desenvolvimento. Neste momento está em WordPress, mas eu depois posso querer fazer alterações e assim tenho controlo total local. O ideal é servir via Cloudflare Tunnel, porque eu não tenho IP fixo e eu não me importo do risco de se faltar eletricidade ou se o computador estiver desligado, o site está down, não faz de lado um site pessoal. Agora quero que me digas, passo a passo, o que fazer primeiro para fazer download de tudo o que é necessário que está neste momento alojado na dominos.pt. Portanto, vai a investigar a dominos.pt e vê como é que eu posso aceder via cPanel ao sítio onde posso fazer download do que preciso agora.

Estou a confirmar o acesso ao cPanel e as opções de backup/exportação na domínios.pt, para te dar os passos exatos e não genéricos.

Thought for 26s

Sim. Não consigo entrar na tua conta da domínios.pt, mas já confirmei como se acede ao cPanel e às ferramentas relevantes. Na área de cliente da domínios.pt, entras em my.dominios.pt, vais a Serviços / Os meus serviços, escolhes a subscrição de alojamento e, em Detalhes do produto, clicas em Login to cPanel. A secção Serviços é precisamente onde a domínios.pt coloca o acesso ao painel de controlo do alojamento.

Para o teu objetivo, o primeiro passo é fazer uma cópia completa antes de mudares qualquer DNS. Na domínios.pt há duas vias que te interessam: a ferramenta de backup no painel e o acesso direto aos ficheiros/base de dados. A própria base de conhecimento recomenda criar um backup completo do alojamento para guardar o estado atual e repor rapidamente em caso de problema.

O caminho mais seguro é este:

1. Entrar no cPanel
Vai a my.dominios.pt → Serviços / Os meus serviços → escolhe o teu alojamento → Login to cPanel.

2. Fazer primeiro um backup completo no painel
Se o teu plano mostrar a opção de backup/restore no WordPress Toolkit ou no painel, faz já esse backup antes de mexer em mais nada. A domínios.pt indica que o alojamento WordPress tem ferramenta própria de backup/restauro e pontos de restauro diários.

3. Descarregar os ficheiros do site
No cPanel, entra em File Manager. A domínios.pt indica que o File Manager serve para gerir os ficheiros do website WordPress. Aí deves localizar a raiz do site — normalmente algo como public_html ou a pasta onde o domínio está a apontar — e descarregar tudo, idealmente primeiro comprimindo a pasta do site em .zip e depois fazendo download desse zip. O mais importante é garantires que levas: wp-content, wp-admin, wp-includes, wp-config.php e quaisquer ficheiros extra da raiz.

4. Exportar a base de dados
No cPanel, abre o phpMyAdmin. A domínios.pt refere que as bases de dados MySQL/MariaDB são geridas a partir do phpMyAdmin. Dentro dele, identificas a base de dados usada pelo WordPress e fazes Export em formato SQL. Para saber qual é a base certa, abre antes o wp-config.php no File Manager e confirma o DB_NAME, DB_USER e DB_HOST.

5. Guardar também dados de infraestrutura
Além de ficheiros e SQL, copia para uma pasta local de migração:

wp-config.php
lista de plugins e tema ativo
versão do PHP do alojamento
quaisquer jobs/rotinas que uses
SMTP/email, se o site enviar emails
Isto não está tudo documentado pela domínios.pt no mesmo artigo, mas na prática poupa muito tempo na recriação do ambiente.

6. Não mudar ainda o domínio
A gestão DNS do domínio é feita na área Domínios → gestão do domínio → Gestão DNS. Isso só interessa mais tarde, quando o site já estiver a funcionar localmente e quiseres apontar o tráfego para Cloudflare Tunnel/novo origin.

O que eu te recomendo fazer já, por ordem

Primeiro faz isto, sem saltares passos:

Entrar no cPanel.
Fazer um backup completo pelo painel, se estiver disponível.
No File Manager, descarregar os ficheiros do WordPress.
No wp-config.php, anotar o nome da base de dados.
No phpMyAdmin, exportar essa base em .sql.
Confirmar que tens localmente:
um .zip dos ficheiros
um .sql
uma cópia do wp-config.php
Depois disso

Quando tiveres esses dois artefactos na mão, o passo seguinte é montar localmente:

Nginx ou Apache
PHP
MariaDB/MySQL
importar o .sql
copiar os ficheiros
ajustar wp-config.php

E só no fim é que configuras Cloudflare Tunnel e mudas DNS.

Se quiseres, no passo seguinte eu dou-te um checklist exato dentro do cPanel, tipo “clica aqui, depois aqui”, para exportares os ficheiros e a base de dados sem falhar nada.