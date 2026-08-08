const stopWords = new Set(['and', 'the', 'with', 'for', 'from', 'that', 'this', 'you', 'your', 'are', 'will', 'our', 'years', 'year', 'work', 'role', 'team', 'using', 'have', 'has', 'into', 'about', 'their', 'who']);
const actionVerbs = /\b(built|led|created|developed|improved|delivered|designed|implemented|optimized|launched|managed|reduced|increased|automated)\b/gi;

function keywords(text) { return [...new Set((text.toLowerCase().match(/[a-z][a-z+#.]{2,}/g) || []).filter((word) => !stopWords.has(word)))]; }
export function calculateAtsBaseline(resumeText, jobDescription, sections = []) {
  const resume = resumeText.toLowerCase();
  const jobWords = keywords(jobDescription).slice(0, 80);
  const matched = jobWords.filter((word) => resume.includes(word));
  const keywordScore = jobWords.length ? Math.round((matched.length / jobWords.length) * 100) : 0;
  const actionScore = Math.min(100, ((resumeText.match(actionVerbs) || []).length * 12));
  const quantifiedScore = Math.min(100, ((resumeText.match(/\b\d+(?:[.,]\d+)?\s?(?:%|x|years?|users?|projects?|clients?)\b/gi) || []).length * 16));
  const completeness = Math.min(100, sections.length * 16);
  const readability = Math.max(25, Math.min(100, 100 - Math.max(0, resumeText.length - 6500) / 70));
  const categories = [
    ['Keyword match', keywordScore, 30, 'Match job-specific terminology and required skills.'],
    ['Action verbs', actionScore, 15, 'Use decisive verbs to show ownership and impact.'],
    ['Quantified results', quantifiedScore, 20, 'Add measurable outcomes to experience and projects.'],
    ['Section completeness', completeness, 20, 'Include relevant, clearly labelled resume sections.'],
    ['Readability', Math.round(readability), 15, 'Keep content concise and easy for ATS systems to parse.']
  ];
  const score = Math.round(categories.reduce((total, [, value, weight]) => total + value * weight / 100, 0));
  return { score, matchPercentage: keywordScore, matchedKeywords: matched.slice(0, 30), missingKeywords: jobWords.filter((word) => !matched.includes(word)).slice(0, 30), atsBreakdown: categories.map(([category, scoreValue, weight, recommendation]) => ({ category, score: scoreValue, weight, reason: `${category} scored ${scoreValue}/100 from deterministic ATS signals.`, recommendation, expectedImprovement: Math.max(0, Math.round((80 - scoreValue) * weight / 100)) })) };
}
