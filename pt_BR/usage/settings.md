---
lang: pt_BR
layout: usage
meta_title: Como Usar o Ghost - Ghost Docs
meta_description: Um guia mais a fundo para usar a plataforma de blog Ghost. Escolheu o Ghost mas não sabe por onde começar? Comece aqui!
heading: Usando o Ghost
subheading: Encontrando seu caminho, e confirure do jeito que você quiser
chapter: usage
section: settings
permalink: /pt_BR/usage/settings/
prev_section: configuration
next_section: managing
---

##  Preferências do Ghost <a id="settings"></a>

Vá para <code class="path">&lt;your URL&gt;/ghost/settings/</code>.

Depois que você tiver terminado de alterar suas configurações você *precisa* clicar no botão "Salvar", isso irá salvar suas alterações.

Você pode conferir suas mudanças visitando a URL do seu blog.

### Configurações do Blog (<code class="path">/general/</code>)

Essas são configurações específicas do Blog.

*   **Título do Blog**: Muda o título do seu Blog. Código usado no Tema `@blog.title`.
*   **Descrição do Blog**: Muda a descrição do seu Blog. Código usado no Tema `@blog.description`.
*   **Logo do Blog**: Envia o logotipo do seu blog, no formato '.png', '.jpg' or '.gif'. Código usado no Tema `@blog.logo`.
*   **Imagem da Capa do Blog**: Envia a imagem de capa do seu blog, no formato '.png', '.jpg' or '.gif'. Código usado no Tema `@blog.cover`.
*   **Endereço de E-mail**: Muda o e-mail que as notificações de administração são enviadas. É *indispensável* que seja um e-mail válido.
*   **Artigos por Página**: Quantos artigos serão mostrados por página. Deve ser um valor numérico.
*   **Tema**: Lista de todos os temas instalados na pasta <code class="path">content/themes</code> directory. Selecionar um deles no menu dropdown irá mudar a aparência do seu blog.

### Preferências do Usuário (<code class="path">/user/</code>)

Essas são as configurações do seu usuário / perfil

*   **Seu Nome**: Esse é o seu nome, que será usado para creditar um artigo publicado. Código usado no Tema (post) `author.name`.
*   **Imagem da Capa**: A imagem de capa do seu perfil é enviada aqui, no formato '.png', '.jpg' or '.gif' format. Código usado no Tema (post) (post) `author.cover`.
*   **Display Picture**: Aqui é aonde você envia a imagem do seu perfil pessoal, no formato '.png', '.jpg' or '.gif' format. Código usado no Tema (post) `author.image`.
*   **Endereço de E-mail**: O endereço do seu site pessoal ou de um de seus perfis em redes sociais. Código usado no Tema (post) `author.email`.
*   **Localização**: Aqui deve conter a sua localização atual. Código usado no Tema (post) `author.location`.
*   **Website**: O endereço do seu site pessoal ou de um de seus perfis em redes sociais. Código usado no Tema (post) `author.website`.
*   **Biografia**: Sua biografia é aonde você pode escrever até 200 caracteres descrevendo você. Código usado no Tema (post) `author.bio`.

#### Mudando sua senha

1.  Preencha os campos com a senha apropriada (atual / nova senha).
2.  Now click **Change Password**.
<p class="note">
    <strong>Nota:</strong> Para sua senha ser alterada é necessário clicar no botão "Mudar Senha", o botão "Salvar" não mudará ela.
</p>