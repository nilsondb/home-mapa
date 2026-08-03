# My Health Map

PROMPT MASTER — MeuMapa v1

Objetivo

Desenvolva um SaaS chamado MeuMapa, destinado ao registro residencial da pressão arterial conforme orientação médica.

O sistema deve substituir completamente o formulário em papel, oferecendo uma experiência moderna, intuitiva e responsiva para pacientes e médicos.

A interface deve transmitir confiança, organização e simplicidade, utilizando tons de azul, branco e verde, inspirados em sistemas de saúde modernos.

IMPORTANTE: Este projeto será expandido futuramente com Inteligência Artificial. Portanto, toda a estrutura deve ser preparada para armazenar o máximo possível de informações clínicas.

Stack

Utilize:

React

TypeScript

Vite

TailwindCSS

shadcn/ui

Supabase (Autenticação + Banco + Storage)

Recharts para gráficos

React Hook Form

Zod

Lucide Icons

O projeto deve ser totalmente responsivo.

Sistema de Login

Criar autenticação completa.

Login

Cadastro

Recuperação de senha

Após login o usuário entra em seu Dashboard.

Tipos de usuários

Inicialmente existirão dois perfis:

Paciente

Pode:

registrar pressão

visualizar histórico

visualizar gráficos

exportar PDF

editar perfil

Médico

Pode:

visualizar pacientes

acompanhar registros

visualizar gráficos

exportar relatórios

(na versão 1 não precisa existir cadastro de médicos pela interface; deixar preparado.)

Dashboard do Paciente

Mostrar:

Bom dia, João.

Card principal:

Hoje

Status das medições

☀️ Manhã

○ Não iniciada

🌙 Noite

○ Não iniciada

Barra de progresso do protocolo.

Exemplo

Dia 3 de 7

43%

Criar quatro cards

📈 Média Geral

❤️ Última pressão

📅 Dias restantes

📄 Relatório

Protocolo

Por padrão

7 dias

mínimo aceitável

5 dias

Cada dia possui

MANHÃ

Primeira aferição

Segunda aferição

Média automática

NOITE

Primeira aferição

Segunda aferição

Média automática

O usuário nunca digita a média.

Ela deve ser calculada automaticamente.

Fluxo da Medição

Quando clicar em

Nova Medição

Perguntar

É uma medição

☀️ Manhã

ou

🌙 Noite

Após escolher

abrir formulário

Campos

Pressão Sistólica

Pressão Diastólica

Pulso

Braço

Direito

Esquerdo

Observações

Botão

Salvar primeira aferição

Após salvar

mostrar

Primeira aferição concluída.

Aguarde aproximadamente 1 minuto para realizar a segunda aferição.

Botão

Registrar segunda aferição

Depois da segunda

calcular automaticamente

Média Sistólica

Média Diastólica

Média Pulso

Salvar tudo.

Histórico

Cada dia deve aparecer como um card.

Exemplo

03/08/2026

☀️ MANHÃ

120x80

122x82

Média

121x81

🌙 NOITE

124x82

126x84

Média

125x83

Observações

Calendário

Dias completos

verde

Dias incompletos

amarelo

Sem registros

cinza

Gráficos

Criar gráficos para

Pressão Sistólica

Pressão Diastólica

Pulso

Média diária

Média semanal

Média mensal

Utilizar Recharts.

Exportação PDF

Criar botão

Exportar PDF

Gerar um relatório limpo contendo

Nome

Período

Todas as aferições

Médias

Gráficos

Observações

Perfil

Nome

Nascimento

Sexo

Peso

Altura

Telefone

Email

Foto

Tela de Orientações

Criar uma tela chamada

Como medir corretamente

Utilizar exatamente estas orientações:

Como medir corretamente

• Utilize aparelho digital de braço validado com braçadeira adequada.

• Descanse por pelo menos cinco minutos antes da medição.

• Sente-se com as costas apoiadas.

• Apoie os pés no chão.

• Mantenha as pernas descruzadas.

• Não converse durante a aferição.

• Faça duas aferições com intervalo aproximado de um minuto.

• Registre as duas medições.

Horário recomendado

Manhã

Realizar dentro de aproximadamente uma hora após acordar.

Após urinar.

Antes do café da manhã.

Antes dos medicamentos para pressão, quando houver.

Noite

Antes de dormir.

Em repouso.

Evitando medir logo após exercício físico.

Evitando medir logo após café.

Evitando medir logo após bebida alcoólica.

Evitando medir logo após fumar.

Tempo de acompanhamento

Ideal

7 dias consecutivos.

Mínimo aceitável

5 dias.

Interpretação prática

Em geral, média residencial inferior a 135 × 85 mmHg costuma estar dentro da faixa desejável para muitos adultos.

Valores persistentemente acima dessa faixa devem ser discutidos com o médico.

Caso exista pressão muito elevada acompanhada de dor no peito, falta de ar, fraqueza importante ou dor de cabeça intensa, procure atendimento médico imediatamente.

Banco de Dados

Criar tabelas:

users

profiles

protocolos

medicoes

medias_periodo

Campos da medição

Data

Hora

Período

Primeira ou Segunda aferição

Sistólica

Diastólica

Pulso

Braço

Observação

Interface

Visual moderno.

Minimalista.

Cards grandes.

Animações suaves.

Modo claro.

Preparado para Dark Mode.

Responsivo.

Design semelhante aos aplicativos Apple Health, Samsung Health e Google Fit.

Preparação para IA (não implementar agora)

Estruturar o banco e o código para permitir futuramente:

análise inteligente das tendências da pressão arterial;

identificação de padrões entre horários e resultados;

comparação entre semanas e meses;

geração automática de resumos clínicos;

sugestões de acompanhamento para discussão com o médico (sem realizar diagnóstico);

painel de risco baseado no histórico.

Objetivo da versão 1

Entregar um SaaS funcional, elegante e pronto para uso por pacientes e médicos, substituindo completamente o mapa residencial em papel, com uma arquitetura preparada para futuras evoluções com Inteligência Artificial, notificações, compartilhamento de dados e integração com dispositivos de saúde.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://home-mapa.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b94195e4-c644-4947-9b1c-017739b541cb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
