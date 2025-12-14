// SEO Generator Utilities
import type { Question, QuestionSEO, ExamKeywordMap } from '../types';

/**
 * Create a URL-safe slug from text
 * Used for exam names, topic names, etc.
 */
export function createSlug(text: string): string {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

const EXAM_KEYWORD_MAP: ExamKeywordMap = {
    "CAT": ["cat pyq", "cat previous year questions", "cat quant questions", "cat aptitude practice", "cat exam preparation"],
    "Placements": ["placement aptitude questions", "campus placement practice", "placement papers", "aptitude for placements"],
    "SSC": {
        "CGL Tier 1": ["ssc cgl pyq", "ssc cgl tier 1 questions"],
        "CGL Tier 2": ["ssc cgl tier 2 questions", "ssc cgl tier 2 pyq"],
        "CHSL": ["ssc chsl questions", "ssc chsl pyq"],
        "_default": ["ssc aptitude questions", "ssc previous year papers"]
    },
    "Banking": {
        "IBPS PO": ["ibps po questions", "ibps po pyq"],
        "SBI PO": ["sbi po questions", "sbi po quant"],
        "RBI Grade B": ["rbi grade b questions"],
        "_default": ["bank exam aptitude", "bank pyq"]
    },
    "Railways": ["railway exam aptitude", "rrb ntpc questions", "rrb pyq"],
    "CUET": ["cuet gat questions", "cuet aptitude practice", "cuet pyq"]
};

const UNIVERSAL_KEYWORDS = [
    "aptitude questions", "aptitude practice", "previous year questions",
    "quantitative aptitude", "logical reasoning questions", "competitive exam questions", "pyq"
];

function getExamSpecificKeywords(exam: string, subExam?: string): string[] {
    const examData = EXAM_KEYWORD_MAP[exam];
    if (!examData) return [];
    if (typeof examData === 'object' && !Array.isArray(examData)) {
        return examData[subExam || '_default'] || examData._default || [];
    }
    return examData;
}

/**
 * Generate comprehensive keywords (specific first, generic last)
 */
export function generateKeywords(question: Question): string[] {
    const examKeywords = question.exam ? getExamSpecificKeywords(question.exam, question.subExam) : [];

    const hierarchicalKeywords = [
        question.exam?.toLowerCase(),
        question.subExam?.toLowerCase(),
        question.section?.toLowerCase(),
        question.category?.toLowerCase(),
        question.topic?.toLowerCase(),
        question.type?.toLowerCase(),
        question.difficulty?.toLowerCase(),
        ...(question.tags || []).map((t: string) => t.toLowerCase())
    ].filter(Boolean) as string[];

    // Specific keywords first, then exam keywords, then universal (generic) last
    return [...new Set([...hierarchicalKeywords, ...examKeywords, ...UNIVERSAL_KEYWORDS])];
}

/**
 * Pre-compute all slugs in O(n) time instead of O(n²)
 * Returns a Map from questionNumber to slug
 */
export function generateAllSlugs(questions: Question[]): Map<number, string> {
    const slugMap = new Map<number, string>();
    const baseSlugCounts = new Map<string, number[]>();

    // First pass: Build base slugs and track duplicates (O(n))
    for (const question of questions) {
        const baseSlug = buildBaseSlug(question);
        if (!baseSlugCounts.has(baseSlug)) {
            baseSlugCounts.set(baseSlug, []);
        }
        baseSlugCounts.get(baseSlug)!.push(question.questionNumber);
    }

    // Second pass: Assign final slugs with indices for duplicates (O(n))
    for (const question of questions) {
        const baseSlug = buildBaseSlug(question);
        const questionNumbers = baseSlugCounts.get(baseSlug)!;

        if (questionNumbers.length === 1) {
            // No duplicates
            slugMap.set(question.questionNumber, baseSlug);
        } else {
            // Has duplicates - assign index based on question number order
            const sortedNumbers = [...questionNumbers].sort((a, b) => a - b);
            const index = sortedNumbers.indexOf(question.questionNumber) + 1;
            slugMap.set(question.questionNumber, `${baseSlug}-${index}`);
        }
    }

    return slugMap;
}

/**
 * Generate slug for a single question (uses pre-computed slug map)
 */
export function generateSlug(question: Question, slugMap?: Map<number, string>): string {
    if (slugMap) {
        return slugMap.get(question.questionNumber) || `question-${question.questionNumber}`;
    }

    // Fallback for backward compatibility (slower, but works)
    if (!question.statement || !question.exam || !question.topic) {
        return `question-${question.questionNumber}`;
    }

    return buildBaseSlug(question);
}

/**
 * Check if a string is an image URL
 */
function isImageUrl(text: string): boolean {
    if (typeof text !== 'string') return false;
    const lower = text.toLowerCase();
    // Check for http/https URLs
    if (lower.startsWith('http://') || lower.startsWith('https://')) return true;
    // Check for common image extensions in the string
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(lower)) return true;
    // Check for cloudinary URLs
    if (lower.includes('cloudinary.com') || lower.includes('res.cloudinary.com')) return true;
    return false;
}

/**
 * Build base slug for a question (used internally)
 * Ensures slug is safe for file paths and not too long
 */
function buildBaseSlug(q: Question): string {
    if (!q.statement || !q.exam || !q.topic) return `question-${q.questionNumber}`;

    // Handle image URLs - use a generic identifier
    let statementText: string;
    if (isImageUrl(q.statement)) {
        statementText = 'visual-question';
    } else if (typeof q.statement === 'string') {
        statementText = q.statement;
    } else {
        statementText = 'visual-question';
    }

    // Create statement slug (limit to 50 chars to prevent path issues)
    const statementSlug = statementText
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 8)
        .join('-')
        .substring(0, 50); // Hard limit on statement part

    const examSlug = (q.exam || '').toLowerCase().replace(/\s+/g, '-').substring(0, 30);
    const subExamSlug = q.subExam && q.subExam !== 'General' 
        ? q.subExam.toLowerCase().replace(/\s+/g, '-').substring(0, 30) 
        : '';
    const topicSlug = (q.topic || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 30);

    const parts = [statementSlug, examSlug];
    if (subExamSlug) parts.push(subExamSlug);
    if (topicSlug) parts.push(topicSlug);

    let slug = parts.join('-');
    
    // Enforce maximum total length (200 chars for Windows compatibility, leaving room for path)
    // If still too long, truncate and add question number
    if (slug.length > 200) {
        slug = slug.substring(0, 180) + `-q${q.questionNumber}`;
    }

    // Final sanitization - remove any remaining invalid characters
    slug = slug.replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    return slug || `question-${q.questionNumber}`;
}

/**
 * Quick slug generation for related questions (simplified, no duplicate checking)
 * Uses question number as fallback for reliability
 */
export function generateQuickSlug(question: Question): string {
    if (!question.statement || !question.exam || !question.topic) {
        return `question-${question.questionNumber}`;
    }
    return buildBaseSlug(question);
}

/**
 * Generate SEO-optimized title (~120 chars, breaks at word boundary)
 */
export function generateTitle(question: Question): string {
    const statementText = typeof question.statement === 'string' && !question.statement.startsWith('http')
        ? question.statement
        : `${question.topic} Question`;

    const examPart = `${question.exam} ${question.difficulty}`;
    const topicPart = question.topic;

    // Calculate max length for statement to fit everything
    const suffixLength = ` | ${examPart} | ${topicPart}`.length;
    const maxStatementLength = 120 - suffixLength - 4; // 4 for "... "

    let truncatedStatement = statementText;

    // If statement is too long, truncate at last word boundary
    if (statementText.length > maxStatementLength) {
        truncatedStatement = statementText.substring(0, maxStatementLength);
        const lastSpace = truncatedStatement.lastIndexOf(' ');
        if (lastSpace > 0) {
            truncatedStatement = truncatedStatement.substring(0, lastSpace);
        }
        truncatedStatement += '...';
    }

    return `${truncatedStatement} | ${examPart} | ${topicPart}`.substring(0, 120);
}

export function generateDescription(question: Question): string {
    let desc = '';

    if (typeof question.statement === 'string' && !question.statement.startsWith('http')) {
        desc += question.statement + ' ';
    } else {
        desc += `${question.topic} visual question. `;
    }

    if ((question.type === 'MCQ' || question.type === 'Multiple Correct') && question.options?.length) {
        const textOptions = question.options.filter((opt: any) => {
            const isText = !opt.type || opt.type === 'text';
            const isNotUrl = typeof opt.content === 'string' && !opt.content.startsWith('http');
            return isText && isNotUrl && opt.content;
        }).slice(0, 5);

        if (textOptions.length > 0) {
            const optionsText = textOptions.map((opt: any, i: number) =>
                `${String.fromCharCode(65 + i)}) ${opt.content}`
            ).join(' ');
            desc += `Options: ${optionsText}. `;
        }
    } else if (question.type === 'Integer') {
        desc += 'Answer type: Integer. ';
    }

    desc += `${question.exam} ${question.difficulty} ${question.topic} question. `;
    desc += 'Solve and get step-by-step solution.';
    return desc;
}

export function generateSchema(question: Question): any {
    const questionText = typeof question.statement === 'string' && !question.statement.startsWith('http')
        ? question.statement.substring(0, 100)
        : `${question.topic} Question`;

    return {
        '@context': 'https://schema.org',
        '@type': 'Question',
        'name': questionText,
        'text': questionText,
        'eduQuestionType': question.type === 'Integer' ? 'Integer answer' : 'Multiple choice',
        'educationalLevel': question.difficulty,
        'about': { '@type': 'Thing', 'name': question.topic }
    };
}

/**
 * Generate SEO data for a question (optimized version with slug map)
 */
export function generateQuestionSEO(
    question: Question,
    slugMap?: Map<number, string>
): QuestionSEO {
    const slug = generateSlug(question, slugMap);
    return {
        slug,
        title: generateTitle(question),
        description: generateDescription(question),
        keywords: generateKeywords(question),
        canonical: `https://aptidude.in/questions/${slug}`,
        ogImage: '/logo-social.png',
        schema: generateSchema(question)
    };
}

/**
 * Generate SEO data for all questions at once (optimized batch processing)
 * Returns a Map from questionNumber to SEO data
 */
export function generateAllQuestionSEO(questions: Question[]): Map<number, QuestionSEO> {
    const seoMap = new Map<number, QuestionSEO>();
    const slugMap = generateAllSlugs(questions);

    for (const question of questions) {
        seoMap.set(question.questionNumber, generateQuestionSEO(question, slugMap));
    }

    return seoMap;
}
