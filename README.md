# Planejador de Roteiro de Viagem

Aplicativo estático para organizar roteiros de viagem em família ou grupo, com edição em tempo real, cálculo automático de custos e exportação do planejamento.

## Funcionalidades

- Roteiro por destino, datas de entrada e saída.
- Itens separados por transporte, hotel, passeios e alimentação.
- Botão `+` para adicionar novos itens livres em cada categoria.
- Leitura automática de valores escritos nas caixas de texto.
- Soma de valores em `R$` e conversão simples de `€` pelo câmbio configurado.
- Multiplicação automática quando o texto contém `por pessoa`.
- Auto-save local no navegador.
- Botão `Salvar` para gravar o roteiro compartilhado no Vercel Blob.
- Botão `Baixar JSON` para baixar um arquivo JSON do roteiro.
- Botão `Abrir` para importar um JSON salvo.
- Botão `Exportar` para gerar um Markdown detalhado.
- Validações de datas, lacunas e pendências.

## Privacidade

O app usa `localStorage` como auto-save local e pode usar Vercel Blob para um roteiro compartilhado entre usuários.

Não há login nem analytics. Quando Vercel Blob está conectado, o botão `Salvar` grava o roteiro em `roteiro/compartilhado.json`, acessível pelo projeto.

## Como usar localmente

Abra `index.html` no navegador ou rode um servidor estático:

```bash
python3 -m http.server 4177
```

Depois acesse:

```text
http://127.0.0.1:4177/index.html
```

## Publicação gratuita na Vercel

O app pode ser publicado na Vercel como projeto estático com uma Function em `/api/roteiro`.

Configuração:

- Framework Preset: `Other`
- Build Command: vazio
- Output Directory: `.`
- Root Directory: padrão

## JSON compartilhado

Para habilitar edição compartilhada entre pessoas:

1. No projeto da Vercel, abra a aba `Storage`.
2. Crie ou conecte um `Blob Store`.
3. Vincule o Blob Store ao projeto.
4. A Vercel cria automaticamente a variável `BLOB_READ_WRITE_TOKEN`.
5. Faça um redeploy.

Depois disso:

- `Salvar` grava o JSON compartilhado no Vercel Blob privado, via `/api/roteiro`.
- Ao abrir o app, ele tenta carregar o roteiro compartilhado.
- `Baixar JSON` salva uma cópia local na máquina.
- `Exportar` salva um `.md` na máquina do operador.

Observação: se duas pessoas salvarem ao mesmo tempo, a última gravação vence.

## Licença

MIT. Pode usar, copiar, adaptar e publicar.
