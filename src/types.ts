// SEO Types and Interfaces

export interface Question {
    questionNumber: number;
    statement: string;
    passage?: string;
    type: string;
    options?: Array<{ type?: string; content: string }>;
    answer?: any;
    explanation: string;
    exam?: string;
    subExam?: string;
    section?: string;
    difficulty?: string;
    tags?: string[];
    category?: string;
    topic?: string;
    updatedAt: string;
    createdAt: string;
}

export interface QuestionSEO {
    slug: string;
    title: string;
    description: string;
    keywords: string[];
    canonical: string;
    ogImage: string;
    schema: any;
}

export interface ExamKeywordMap {
    [exam: string]: string[] | {
        [subExam: string]: string[];
        _default: string[];
    };
}
