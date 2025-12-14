// Data Fetcher Utilities
import type { Question } from '../types';

// Learning content types
export interface LearningCourse {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  isPublished: boolean;
  subjects?: LearningSubject[];
}

export interface LearningSubject {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  topics?: { topic: LearningTopic; order: number }[];
}

export interface LearningTopic {
  _id: string;
  title: string;
  slug: string;
  content?: string;
  description?: string;
  headings?: { id: string; text: string; level: number }[];
  isPublished: boolean;
}

// API base URL - uses environment variable or defaults
const getApiBase = (): string => {
  // Check for Vite/Astro environment variable
  if (typeof import.meta !== 'undefined' && import.meta.env?.API_URL) {
    return import.meta.env.API_URL;
  }
  // Check for Node.js environment variable
  if (typeof process !== 'undefined' && process.env?.API_URL) {
    return process.env.API_URL;
  }
  // Default to localhost for development
  return 'http://localhost:8080';
};

const API_BASE = getApiBase();

let questionsCache: Question[] | null = null;
let fetchPromise: Promise<Question[]> | null = null;

// Learning content caches
let coursesCache: LearningCourse[] | null = null;
let topicsCache: LearningTopic[] | null = null;

/**
 * Fetch all questions in batches (paginated)
 * @param maxQuestions - Optional limit for testing (e.g., 100 for quick builds)
 */
export async function fetchAllQuestions(maxQuestions?: number): Promise<Question[]> {
    // Return cached data if available and no specific limit is requested (or limit matches)
    if (questionsCache && !maxQuestions) {
        console.log('📦 Using cached questions data');
        return questionsCache;
    }

    // If a fetch is already in progress and we want all questions, return that promise
    if (fetchPromise && !maxQuestions) {
        console.log('⏳ Waiting for existing fetch request...');
        return fetchPromise;
    }

    const fetchLogic = async () => {
        const allQuestions: Question[] = [];
        let page = 1;
        const limit = 1000;
        let hasMore = true;

        console.log('📊 Fetching questions for build...');
        console.log(`API URL: ${API_BASE}`);
        if (maxQuestions) {
            console.log(`⚠ TEST MODE: Building only ${maxQuestions} questions`);
        }

        while (hasMore) {
            try {
                const url = `${API_BASE}/api/questions?page=${page}&limit=${limit}`;
                console.log(`  → Fetching page ${page}: ${url}`);

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (!data.questions || !Array.isArray(data.questions)) {
                    console.error('  ✗ Invalid response format:', data);
                    throw new Error('Invalid API response format');
                }

                allQuestions.push(...data.questions);

                console.log(`  ✓ Fetched ${allQuestions.length} questions so far...`);

                // Check if we've reached the test limit
                if (maxQuestions && allQuestions.length >= maxQuestions) {
                    console.log(`  ⚠ Reached test limit of ${maxQuestions} questions`);
                    break;
                }

                hasMore = data.questions.length === limit;
                page++;
            } catch (error) {
                console.error(`  ✗ Error fetching page ${page}:`, error);
                throw error;
            }
        }

        // Trim to exact limit if specified
        const finalQuestions = maxQuestions ? allQuestions.slice(0, maxQuestions) : allQuestions;

        // Cache the result if we fetched everything (no limit or limit matches total)
        if (!maxQuestions) {
            questionsCache = finalQuestions;
        }

        console.log(`✅ Total questions fetched: ${finalQuestions.length}\n`);
        return finalQuestions;
    };

    // If we're not limiting questions, cache the promise
    if (!maxQuestions) {
        fetchPromise = fetchLogic().catch(err => {
            fetchPromise = null; // Reset on error
            throw err;
        });
        return fetchPromise;
    }

    return fetchLogic();
}

/**
 * Build indexes for fast related question lookup
 */
export function buildQuestionIndexes(questions: Question[]): {
    byTopic: Map<string, Question[]>;
    byCategory: Map<string, Question[]>;
    byExam: Map<string, Question[]>;
    byExamAndTopic: Map<string, Question[]>;
    byQuestionNumber: Map<number, Question>;
} {
    const byTopic = new Map<string, Question[]>();
    const byCategory = new Map<string, Question[]>();
    const byExam = new Map<string, Question[]>();
    const byExamAndTopic = new Map<string, Question[]>();
    const byQuestionNumber = new Map<number, Question>();

    for (const q of questions) {
        // Index by question number
        byQuestionNumber.set(q.questionNumber, q);

        // Index by topic
        if (q.topic) {
            if (!byTopic.has(q.topic)) {
                byTopic.set(q.topic, []);
            }
            byTopic.get(q.topic)!.push(q);
        }

        // Index by category
        if (q.category) {
            if (!byCategory.has(q.category)) {
                byCategory.set(q.category, []);
            }
            byCategory.get(q.category)!.push(q);
        }

        // Index by exam
        if (q.exam) {
            if (!byExam.has(q.exam)) {
                byExam.set(q.exam, []);
            }
            byExam.get(q.exam)!.push(q);

            // Index by exam + topic combination
            if (q.topic) {
                const key = `${q.exam}::${q.topic}`;
                if (!byExamAndTopic.has(key)) {
                    byExamAndTopic.set(key, []);
                }
                byExamAndTopic.get(key)!.push(q);
            }
        }
    }

    return { byTopic, byCategory, byExam, byExamAndTopic, byQuestionNumber };
}

/**
 * Get related questions using pre-built indexes (O(1) lookup instead of O(n))
 */
export function getRelatedQuestions(
    question: Question,
    indexes: { byTopic: Map<string, Question[]>; byCategory: Map<string, Question[]> },
    limit = 6
): Question[] {
    const candidates: Question[] = [];

    // Get questions from same topic
    if (question.topic) {
        const topicQuestions = indexes.byTopic.get(question.topic) || [];
        candidates.push(...topicQuestions.filter(q => q.questionNumber !== question.questionNumber));
    }

    // Get questions from same category
    if (question.category) {
        const categoryQuestions = indexes.byCategory.get(question.category) || [];
        candidates.push(...categoryQuestions.filter(q => q.questionNumber !== question.questionNumber));
    }

    // Remove duplicates and limit
    const unique = Array.from(new Map(candidates.map(q => [q.questionNumber, q])).values());
    return unique.slice(0, limit);
}

/**
 * Fetch all learning courses from API (with full topic data)
 */
export async function fetchAllCourses(): Promise<LearningCourse[]> {
    if (coursesCache) {
        console.log('📦 Using cached courses data');
        return coursesCache;
    }

    console.log('📚 Fetching learning courses with topics...');

    // Core courses to fetch
    const coreCoursesSlugs = [
        'quantitative-aptitude',
        'logical-reasoning',
        'reading-comprehension',
        'verbal-ability',
        'data-interpretation'
    ];

    const courses: LearningCourse[] = [];

    // Fetch each course by slug to get full topic data
    for (const slug of coreCoursesSlugs) {
        try {
            const url = `${API_BASE}/api/learning/courses/slug/${slug}`;
            console.log(`  → Fetching: ${url}`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                console.log(`  ⚠ Course not found: ${slug}`);
                continue;
            }

            const course = await response.json();
            courses.push(course);
            console.log(`  ✓ Fetched: ${course.title}`);
        } catch (error) {
            console.error(`  ✗ Error fetching ${slug}:`, error);
        }
    }

    console.log(`✅ Fetched ${courses.length} courses with topics`);
    
    coursesCache = courses;
    return courses;
}

/**
 * Fetch all learning topics from API
 */
export async function fetchAllTopics(): Promise<LearningTopic[]> {
    if (topicsCache) {
        console.log('📦 Using cached topics data');
        return topicsCache;
    }

    console.log('📝 Fetching learning topics...');
    console.log(`API URL: ${API_BASE}/api/learning/topics`);

    try {
        const response = await fetch(`${API_BASE}/api/learning/topics`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const topics = await response.json();
        console.log(`✅ Fetched ${topics.length} topics`);
        
        topicsCache = topics;
        return topics;
    } catch (error) {
        console.error('Error fetching topics:', error);
        return [];
    }
}

/**
 * Fetch a single topic by slug with full content
 */
export async function fetchTopicBySlug(slug: string): Promise<LearningTopic | null> {
    console.log(`📝 Fetching topic: ${slug}`);

    try {
        const response = await fetch(`${API_BASE}/api/learning/topics/slug/${slug}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                console.log(`  Topic not found: ${slug}`);
                return null;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const topic = await response.json();
        return topic;
    } catch (error) {
        console.error(`Error fetching topic ${slug}:`, error);
        return null;
    }
}

/**
 * Fetch a single course by slug with full content
 */
export async function fetchCourseBySlug(slug: string): Promise<LearningCourse | null> {
    console.log(`📚 Fetching course: ${slug}`);

    try {
        const response = await fetch(`${API_BASE}/api/learning/courses/slug/${slug}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                console.log(`  Course not found: ${slug}`);
                return null;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const course = await response.json();
        return course;
    } catch (error) {
        console.error(`Error fetching course ${slug}:`, error);
        return null;
    }
}
