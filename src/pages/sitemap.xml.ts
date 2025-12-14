import type { APIRoute } from 'astro';
import { fetchAllQuestions, buildQuestionIndexes } from '../utils/dataFetcher';
import { generateAllQuestionSEO, createSlug } from '../utils/seoGenerator';
import metaData from '../data/meta.json';

const SITE_URL = 'https://aptidude.in';
const APP_URL = 'https://aptidude.in/app';

// Static pages on the SEO layer (Astro)
const seoLayerPages = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/learn', changefreq: 'weekly', priority: '0.95' },
];

// Static pages on the React app (/app)
const reactAppPages = [
  { loc: '/app', changefreq: 'daily', priority: '0.9' },
  { loc: '/app/learn', changefreq: 'weekly', priority: '0.9' },
  { loc: '/app/practice', changefreq: 'weekly', priority: '0.9' },
  { loc: '/app/compete', changefreq: 'weekly', priority: '0.9' },
  { loc: '/app/question-lists', changefreq: 'weekly', priority: '0.8' },
  { loc: '/app/catmocks', changefreq: 'weekly', priority: '0.9' },
  { loc: '/app/discuss', changefreq: 'daily', priority: '0.7' },
  { loc: '/app/blogs', changefreq: 'daily', priority: '0.8' },
  { loc: '/app/about', changefreq: 'monthly', priority: '0.5' },
  { loc: '/app/contact', changefreq: 'monthly', priority: '0.5' },
  { loc: '/app/ratings-explained', changefreq: 'monthly', priority: '0.5' },
  { loc: '/app/careers', changefreq: 'weekly', priority: '0.6' },
  { loc: '/app/terms', changefreq: 'yearly', priority: '0.3' },
  { loc: '/app/privacy', changefreq: 'yearly', priority: '0.3' },
  { loc: '/app/cookies', changefreq: 'yearly', priority: '0.3' },
];

export const GET: APIRoute = async () => {
  try {
    console.log('🗺️  Generating comprehensive sitemap...');
    const startTime = Date.now();

    const questions = await fetchAllQuestions();
    const indexes = buildQuestionIndexes(questions);

    console.log(`📊 Generating sitemap for ${questions.length} questions...`);

    // Pre-compute all SEO data once
    console.log('⚡ Pre-computing SEO data...');
    const seoMap = generateAllQuestionSEO(questions);
    console.log(`✅ Pre-computed SEO for ${seoMap.size} questions`);

    // 1. SEO layer static pages
    const seoLayerUrls = seoLayerPages.map(page => `
  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('');

    // 2. React app static pages
    const reactAppUrls = reactAppPages.map(page => `
  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('');

    // Only the 5 core learning courses
    const CORE_COURSES = [
      'quantitative-aptitude',
      'logical-reasoning', 
      'reading-comprehension',
      'verbal-ability',
      'data-interpretation'
    ];

    // 3. Course pages from meta.json (high priority SEO pages - only core courses)
    const courseUrls = CORE_COURSES
      .map(slug => (metaData.courses as Record<string, any>)[slug])
      .filter(Boolean)
      .map((course: any) => `
  <url>
    <loc>${SITE_URL}${course.path}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.95</priority>
  </url>`).join('');

    // 4. Topic pages from meta.json (high priority SEO pages - only for core courses)
    const metaTopicUrls = Object.values(metaData.topics)
      .filter((topic: any) => {
        const courseSlug = topic.path.split('/')[2];
        return CORE_COURSES.includes(courseSlug);
      })
      .map((topic: any) => `
  <url>
    <loc>${SITE_URL}${topic.path}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`).join('');

    // 5. Exam pages from questions data (SEO layer)
    const examUrls = Array.from(indexes.byExam.keys()).map(examName => {
      const examSlug = createSlug(examName);
      return `
  <url>
    <loc>${SITE_URL}/learn/${examSlug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`;
    }).join('');

    // 6. Topic pages from questions data (SEO layer - exam + topic combinations)
    const topicUrls = Array.from(indexes.byExamAndTopic.keys()).map(key => {
      const [examName, topicName] = key.split('::');
      const examSlug = createSlug(examName);
      const topicSlug = createSlug(topicName);
      return `
  <url>
    <loc>${SITE_URL}/learn/${examSlug}/${topicSlug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }).join('');

    // 5. Question pages (SEO layer - sorted by updatedAt)
    questions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const questionUrls = questions.map((q) => {
      try {
        const seo = seoMap.get(q.questionNumber);
        if (!seo) {
          console.warn(`⚠️  No SEO data for question #${q.questionNumber}`);
          return '';
        }
        const lastmod = new Date(q.updatedAt).toISOString().split('T')[0];
        return `
  <url>
    <loc>${SITE_URL}/questions/${seo.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
      } catch (error) {
        console.error(`Error processing question #${q.questionNumber}:`, error);
        return '';
      }
    }).filter(Boolean).join('');

    const sitemapTime = ((Date.now() - startTime) / 1000).toFixed(2);

    const courseCount = Object.keys(metaData.courses).length;
    const metaTopicCount = Object.keys(metaData.topics).length;
    const totalUrls = seoLayerPages.length + reactAppPages.length + courseCount + metaTopicCount + indexes.byExam.size + indexes.byExamAndTopic.size + questions.length;
    
    console.log(`✅ Sitemap generated in ${sitemapTime}s with ${totalUrls} URLs`);
    console.log(`   - SEO layer pages: ${seoLayerPages.length}`);
    console.log(`   - React app pages: ${reactAppPages.length}`);
    console.log(`   - Course pages (meta.json): ${courseCount}`);
    console.log(`   - Topic pages (meta.json): ${metaTopicCount}`);
    console.log(`   - Exam pages (questions): ${indexes.byExam.size}`);
    console.log(`   - Topic pages (questions): ${indexes.byExamAndTopic.size}`);
    console.log(`   - Question pages: ${questions.length}`);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${seoLayerUrls}
${reactAppUrls}
${courseUrls}
${metaTopicUrls}
${examUrls}
${topicUrls}
${questionUrls}
</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Fatal error in sitemap generation:', error);
    throw error;
  }
};
