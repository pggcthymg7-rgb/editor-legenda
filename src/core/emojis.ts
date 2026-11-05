// Sugestão de emoji pelo sentido da palavra (pura, offline, PT/EN/ES). Estilo Submagic/CapCut.

const TABLE: [RegExp, string[]][] = [
  [/^(dinheiro|grana|money|dinero|lucro|r\$|\$|reais|d[oó]lar(es)?|pagar|pago|venda[s]?|vende[r]?|rico|rica)$/, ['💰', '💸', '🤑']],
  [/^(amor|amo|love|amar|cora[cç][aã]o|paix[aã]o|querida?o?)$/, ['❤️', '😍', '🥰']],
  [/^(fogo|fire|quente|incr[ií]vel|top|brabo|braba|insano|insana)$/, ['🔥', '🤯', '💥']],
  [/^(rir|risada|engra[cç]ado|kkk+|haha+|lol|piada)$/, ['😂', '🤣', '😆']],
  [/^(triste|chorar|choro|sad|perdi|perda)$/, ['😢', '😭', '💔']],
  [/^(ideia|dica|segredo|truque|tip|idea|aprender|aprenda)$/, ['💡', '🧠', '🤫']],
  [/^(tempo|hora[s]?|r[aá]pido|agora|minuto[s]?|time|now|hoje)$/, ['⏰', '⚡', '⏳']],
  [/^(sucesso|ganhar|vit[oó]ria|win|campe[aã]o|meta|objetivo|resultado[s]?)$/, ['🏆', '🎯', '🚀']],
  [/^(crescer|cresce|crescimento|subir|aumentar|alta|growth)$/, ['📈', '🚀', '⬆️']],
  [/^(cair|queda|caiu|baixa|perder|down)$/, ['📉', '⬇️', '😬']],
  [/^(aten[cç][aã]o|cuidado|alerta|perigo|erro|nunca|warning)$/, ['⚠️', '🚨', '❌']],
  [/^(sim|certo|correto|isso|exato|yes|ok)$/, ['✅', '👍', '👌']],
  [/^(n[aã]o|errado|no|jamais)$/, ['❌', '🚫', '🙅']],
  [/^(casa|im[oó]vel|apartamento|ap[eê]|home|house)$/, ['🏠', '🏡', '🔑']],
  [/^(carro|car|dirigir|viagem|viajar)$/, ['🚗', '✈️', '🧳']],
  [/^(comida|comer|fome|food|almo[cç]o|jantar)$/, ['🍔', '🍕', '😋']],
  [/^(trabalho|trabalhar|work|empresa|neg[oó]cio[s]?|business)$/, ['💼', '🏢', '📊']],
  [/^(celular|telefone|app|phone|instagram|tiktok|reels?)$/, ['📱', '📲', '🎬']],
  [/^(olha|olhe|veja|ver|look|mira)$/, ['👀', '👉', '🔎']],
  [/^(pergunta|por ?qu[eê]|como|why|how|d[uú]vida)$/, ['🤔', '❓', '🧐']],
  [/^(feliz|alegria|happy|festa|parab[eé]ns)$/, ['😄', '🎉', '🥳']],
  [/^(for[cç]a|forte|academia|treino|gym)$/, ['💪', '🏋️', '🔥']],
];

const clean = (w: string) =>
  w
    .toLowerCase()
    .normalize('NFC')
    .replace(/^[^\p{L}\p{N}$]+|[^\p{L}\p{N}$]+$/gu, '');

/** Até `max` emojis sugeridos para a palavra (vazio se não reconhecer). */
export function suggestEmojis(word: string, max = 3): string[] {
  const w = clean(word);
  if (!w) return [];
  for (const [re, list] of TABLE) if (re.test(w)) return list.slice(0, max);
  return [];
}

/** Sugestões para a frase inteira (sem repetir), na ordem das palavras. */
export function suggestForText(words: string[], max = 6): string[] {
  const out: string[] = [];
  for (const w of words) for (const e of suggestEmojis(w)) if (!out.includes(e) && out.length < max) out.push(e);
  return out;
}

/** Acrescenta o emoji ao fim do texto (troca se já terminar com um emoji da lista). */
export function withEmoji(text: string, emoji: string): string {
  const base = text
    .replace(/\s*(\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic})*)+$/u, '')
    .trim()
    .slice(0, Math.max(0, 200 - emoji.length - 1));
  return `${base} ${emoji}`.trim();
}

