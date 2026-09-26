const TERM_ALIASES: Record<string, string[]> = {
    만성질병: ["만성질병", "만성질환", "만성 질환", "만성 질병"],
    만성질환: ["만성질병", "만성질환", "만성 질환", "만성 질병"],
    고혈압: ["고혈압", "혈압"],
    당뇨: ["당뇨", "당뇨병"],
    비만: ["비만", "체중", "BMI"],
    이상지질: ["이상지질", "콜레스테롤", "중성지방", "지질"],
    콩팥: ["콩팥", "신장", "만성콩팥"],
    뇌졸중: ["뇌졸중", "중풍"],
};

const NOISE_PATTERNS = [/목\s*차/, /발간\s*(목적|사|배경)/, /국민건강증진법/, /조사\s*개요/, /총\s*괄/, /보고서\s*구성/];
const SUBSTANCE_PATTERNS = [/유병률/, /[%％]/, /환\s*자/, /인\s*구/, /고혈압/, /당\s*뇨/, /진단/, /치료율/, /인지율/];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const countMatches = (text: string, term: string) =>
    (text.match(new RegExp(escapeRegExp(term), "gi")) ?? []).length;

/** Extract the core topic from a Korean question (e.g. "만성질병에 대해서 설명해줘" → "만성질병"). */
export const extractPrimaryTopic = (query: string): string | null => {
    const topic = query
        .trim()
        .replace(/에?\s*대해서?\s*(설명|알려|말해|뭐|무엇|좀|해|줘|주세요).*/gi, "")
        .replace(/[?？!！.。\s]+/g, "")
        .trim();
    return topic.length >= 2 ? topic : null;
};

/** Expand a Korean user query into DB search terms (handles synonym variants like 만성질병/만성질환). */
export const expandSearchTerms = (query: string): string[] => {
    const terms = new Set<string>();
    const normalized = query.trim();
    if (!normalized) return [];

    const topic = extractPrimaryTopic(query);
    if (topic) {
        terms.add(topic);
    }

    for (const [key, aliases] of Object.entries(TERM_ALIASES)) {
        if (normalized.includes(key) || topic?.includes(key)) {
            aliases.forEach((alias) => terms.add(alias));
        }
    }

    return [...terms].filter((term) => term.length >= 2);
};

/** Rank page text — prefer substantive statistics sections over report intro/TOC. */
export const scorePageContent = (
    content: string,
    searchTerms: string[],
    primaryTopic: string | null,
): number => {
    let score = 0;

    for (const term of searchTerms) {
        score += countMatches(content, term) * 2;
    }
    if (primaryTopic) {
        score += countMatches(content, primaryTopic) * 4;
    }
    for (const pattern of SUBSTANCE_PATTERNS) {
        if (pattern.test(content)) score += 6;
    }
    for (const pattern of NOISE_PATTERNS) {
        if (pattern.test(content)) score -= 12;
    }
    if (content.length < 150) score -= 15;
    else if (content.length > 400) score += 4;

    return score;
};

export const rankSnippets = <T extends { content: string }>(
    rows: T[],
    searchTerms: string[],
    primaryTopic: string | null,
    maxPages: number,
): T[] => {
    const ranked = rows
        .map((row) => ({ row, score: scorePageContent(row.content, searchTerms, primaryTopic) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score);

    if (ranked.length === 0) {
        return rows.slice(0, maxPages);
    }

    return ranked.slice(0, maxPages).map(({ row }) => row);
};
