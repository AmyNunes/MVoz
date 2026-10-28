/**
 * Textos de leitura, listas de palavras e frases dos exercícios (seção 8.4), em português.
 * A IA pode gerar mais na Fase 5 (`readingText`).
 */

export type ReadingText = {
  title: string;
  lines: string[];
};

export const TEXTS: Record<string, ReadingText> = {
  'north-wind': {
    title: 'O Vento Norte e o Sol',
    lines: [
      'O Vento Norte e o Sol discutiam quem era o mais forte quando viram um viajante que vinha pela estrada, enrolado num casaco grosso.',
      'Combinaram, então, que ganharia quem conseguisse tirar o casaco do viajante primeiro.',
      'O Vento Norte soprou com toda a força, mas, quanto mais soprava, mais o viajante apertava o casaco no corpo.',
      'Cansado, o vento desistiu. Aí o Sol apareceu e brilhou, morno e tranquilo.',
      'Em pouco tempo, o viajante sentiu calor e tirou o casaco.',
      'O Vento Norte teve que admitir: o Sol era o mais forte dos dois.',
    ],
  },
  counting: {
    title: 'Contagem',
    lines: ['Um, dois, três, quatro, cinco.', 'Um, dois, três, quatro, cinco, seis, sete, oito.', 'Um, dois, três, quatro, cinco, seis, sete, oito, nove, dez.'],
  },
  'counting-20': {
    title: 'De 1 a 20',
    lines: [
      'Um, dois, três, quatro, cinco, seis, sete, oito, nove, dez.',
      'Onze, doze, treze, catorze, quinze, dezesseis, dezessete, dezoito, dezenove, vinte.',
    ],
  },
  'weekdays-months': {
    title: 'Dias e meses',
    lines: [
      'Segunda, terça, quarta, quinta, sexta, sábado, domingo.',
      'Janeiro, fevereiro, março, abril, maio, junho.',
      'Julho, agosto, setembro, outubro, novembro, dezembro.',
    ],
  },
  'short-expressions': {
    title: 'Expressões curtas',
    lines: ['Oi!', 'Tchau!', 'Aham.', 'Uhum.', 'Tudo bem?', 'Obrigado!', 'Valeu!', 'Com licença.', 'Pode ser.', 'Até mais!'],
  },
  'breath-groups': {
    title: 'Frases com pausas',
    lines: [
      'Hoje de manhã / eu acordei cedo / e fui caminhar no parque.',
      'O dia estava bonito / e o café da padaria / estava quentinho.',
      'Na volta / encontrei uma amiga / e combinamos um almoço / para sábado.',
    ],
  },
  'projection-calls': {
    title: 'Chamadas',
    lines: ['Ei!', 'Olá!', 'Bom dia!', 'Aqui, por favor!', 'Pode vir, está aberto!'],
  },
  'short-sentences': {
    title: 'Frases curtas',
    lines: [
      'Bom dia, tudo bem com você?',
      'Eu gosto muito de café da manhã.',
      'Amanhã vai fazer sol.',
      'Vamos marcar um almoço na semana que vem.',
      'Obrigado pela ajuda, foi muito gentil.',
    ],
  },
  'floor-sentences': {
    title: 'Frases para o piso',
    lines: [
      'Eu vou passar na farmácia depois do trabalho.',
      'A reunião ficou para quinta-feira à tarde.',
      'Comprei pão, leite e frutas no mercado.',
      'Hoje eu prefiro ficar em casa e descansar.',
      'Ele disse que chega antes das oito.',
    ],
  },
  'smile-vowels': {
    title: 'Vogais e palavras',
    lines: ['i – ê – é – a', 'mil – mel – mé – má', 'Vi o rio de manhã.', 'Ela leu a lista inteira.'],
  },
  'forward-words': {
    title: 'Palavras',
    lines: ['i – a – i – u', 'vida, fita, tia, dia, linda', 'Lia levou a filha à feira.'],
  },
  'f2-syllables': {
    title: 'Sílabas',
    lines: ['vi – vê – vá – vó – vu', 'vi – vi – vi – vi – vi', 'vida, vela, vaso, vovó, uva'],
  },
  'nasal-sentences': {
    title: 'Frases com sons nasais',
    lines: ['mmm-mi, mmm-mã', 'Minha mãe mima o meu menino.', 'Amanhã a manhã vai ser mansa.', 'Hoje eu vou ao cinema com a turma.'],
  },
  'vowel-words': {
    title: 'Palavras com vogal no começo',
    lines: ['vvv → uuu', 'ha – hê – hi – hó – hu', 'ela, oito, uva, ali, ontem, ideia, amor, isso'],
  },
  expressive: {
    title: 'Leitura expressiva',
    lines: [
      'Alegria: "Eu PASSEI na prova! Nem acredito!"',
      'Surpresa: "Você aqui? Que coisa BOA te ver!"',
      'Calma: "Respira. Está TUDO bem. Vai dar certo."',
    ],
  },
  'cork-sentences': {
    title: 'Frases',
    lines: ['O tempo está bom para caminhar na praia.', 'Três pratos de trigo para três tigres tristes.'],
  },
  'tongue-twisters': {
    title: 'Trava-línguas',
    lines: [
      'Três pratos de trigo para três tigres tristes.',
      'O sabiá sabia assobiar.',
      'Sete selas sem sela, setenta selas com sela.',
    ],
  },
  'ladder-words': {
    title: 'Palavras',
    lines: [
      'mão, mel, mar, meu, mais',
      'sim, não, bom, bem, já',
      'casa, mesa, café, livro, porta',
      'hoje, amanhã, cedo, tarde, noite',
    ],
  },
  'monologue-topics': {
    title: 'Temas',
    lines: [
      'Como foi o seu dia até agora?',
      'Um lugar que você gostaria de conhecer, e por quê.',
      'A melhor comida que você já comeu.',
      'Um filme ou série que você recomendaria.',
      'Descreva o cômodo onde você está agora.',
    ],
  },
  'conversation-questions': {
    title: 'Perguntas',
    lines: [
      'Qual foi a coisa mais engraçada que aconteceu com você esta semana?',
      'Se você pudesse viajar amanhã, para onde iria? E você, já foi lá?',
      'Qual é a sua comida preferida? Você sabe cozinhar?',
      'Conte de alguém que te ajudou recentemente.',
      'O que te deixa de bom humor logo cedo?',
      'Qual música você colocaria para animar uma festa?',
    ],
  },
  'phone-script': {
    title: 'Roteiro de áudio',
    lines: [
      'Oi, tudo bem? Aqui é do apartamento 32.',
      'Queria saber se a encomenda que chegou ontem já está na portaria.',
      'Se estiver, eu passo aí às seis para buscar. Obrigado, até mais!',
    ],
  },
  missions: {
    title: 'Missões',
    lines: [
      'Degrau 1: dizer "obrigado" ou "obrigada" no caixa.',
      'Degrau 2: fazer um pedido no balcão (padaria, café, lanchonete).',
      'Degrau 3: puxar uma conversa rápida com alguém conhecido.',
      'Degrau 4: marcar algo por telefone (consulta, entrega, horário).',
    ],
  },
};
