# Planejador de Roteiro de Viagem

Aplicativo estático para organizar roteiros de viagem em família ou grupo, com edição em tempo real, cálculo automático de custos e exportação do planejamento.

## Funcionalidades

- Roteiro por destino, datas de entrada e saída.
- Itens separados por transporte, hotel e passeios.
- Botão `+` para adicionar novos itens livres em cada categoria.
- Leitura automática de valores escritos nas caixas de texto.
- Soma de valores em `R$` e conversão simples de `€` pelo câmbio configurado.
- Multiplicação automática quando o texto contém `por pessoa`.
- Auto-save local no navegador.
- Botão `Salvar` para baixar um arquivo JSON do roteiro.
- Botão `Abrir` para importar um JSON salvo.
- Botão `Exportar` para gerar um Markdown detalhado.
- Validações de datas, lacunas e pendências.

## Privacidade

Este app roda inteiramente no navegador. Os dados ficam no `localStorage` local do dispositivo, exceto quando o usuário baixa um arquivo JSON ou Markdown.

Não há backend, banco de dados, login, analytics ou envio automático de dados.

## Como usar localmente

Abra `index.html` no navegador ou rode um servidor estático:

```bash
python3 -m http.server 4177
```

Depois acesse:

```text
http://127.0.0.1:4177/index.html
```

## Publicação gratuita

Por ser estático, pode ser publicado gratuitamente em:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

Para GitHub Pages, publique o repositório e habilite Pages usando a branch principal, pasta raiz.

## Licença

MIT. Pode usar, copiar, adaptar e publicar.
